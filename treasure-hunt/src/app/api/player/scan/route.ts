import { NextRequest, NextResponse } from 'next/server'
import { requireTeam } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashToken } from '@/lib/qr'

export async function POST(req: NextRequest) {
  const { session, error } = await requireTeam()
  if (error) return error

  const body = await req.json()
  const { token } = body as { token: string }

  if (!token || typeof token !== 'string') {
    return NextResponse.json({
      success: false,
      reason: 'INVALID_QR',
      title: 'Invalid QR Code 🔍',
      message: 'Could not read a valid code from this scan.',
      hint: 'Please try scanning again in steady lighting.',
    })
  }

  const cleanToken = token.trim()

  // 1. Direct check for FUN DUMMY DIWALI QR (by token string or prefix)
  const isDiwaliToken =
    cleanToken.startsWith('fun_diwali_') ||
    cleanToken.toLowerCase().includes('happy_diwali') ||
    cleanToken.toLowerCase().includes('happydiwali') ||
    cleanToken.toLowerCase().includes('diwali_fun') ||
    cleanToken.toLowerCase().includes('diwalidecoy')

  if (isDiwaliToken) {
    return NextResponse.json({
      success: false,
      isFunDiwali: true,
      reason: 'FUN_DIWALI',
      title: '🪔 Happy Diwali! 🎉',
      message: '✨ Bura na mano, Diwali hai! ✨\nYeh ek Fun Dummy Decoy QR hai! Clue dhundte raho aur apna asli treasure unlock karo! 🕵️‍♂️',
      hint: 'Decoy found! Read your clue card carefully to find your real team QR.',
    })
  }

  // Look up QrCode by direct tokenHash or hash of raw token
  let qrCode = await prisma.qrCode.findUnique({
    where: { tokenHash: cleanToken },
    include: { event: true, assignedTeam: true },
  })

  if (!qrCode) {
    const tokenHash = hashToken(cleanToken)
    qrCode = await prisma.qrCode.findUnique({
      where: { tokenHash },
      include: { event: true, assignedTeam: true },
    })
  }

  // 2. Check if the DB record is a Fun Dummy Diwali QR
  if (
    qrCode &&
    (qrCode.tokenHash.startsWith('fun_diwali_') ||
      (qrCode.assignedTeamId === null && qrCode.stageNumber === null && qrCode.qrType === 'TEAM_STAGE'))
  ) {
    return NextResponse.json({
      success: false,
      isFunDiwali: true,
      reason: 'FUN_DIWALI',
      title: '🪔 Happy Diwali! 🎉',
      message: '✨ Bura na mano, Diwali hai! ✨\nYeh ek Fun Dummy Decoy QR hai! Clue dhundte raho aur apna asli treasure unlock karo! 🕵️‍♂️',
      hint: 'Decoy found! Read your clue card carefully to find your real team QR.',
    })
  }

  if (!qrCode || !qrCode.isActive) {
    await prisma.scanHistory.create({
      data: {
        eventId: qrCode?.eventId ?? 0,
        teamId: session!.teamId,
        qrCodeId: qrCode?.id ?? null,
        success: false,
        failureReason: 'Invalid or inactive QR code',
      },
    }).catch(() => {/* ignore if eventId is 0 */})
    return NextResponse.json({
      success: false,
      reason: 'INVALID_QR',
      title: 'Not a Treasure Hunt QR 🔍',
      message: 'This QR code is not part of the active Glowfiesta game.',
      hint: 'Make sure to scan the official printed clue cards hidden by the organizers.',
    })
  }

  // Check event is LIVE
  if (qrCode.event.status !== 'LIVE') {
    await prisma.scanHistory.create({
      data: {
        eventId: qrCode.eventId,
        teamId: session!.teamId,
        qrCodeId: qrCode.id,
        success: false,
        failureReason: 'Event is not live',
      },
    })
    return NextResponse.json({
      success: false,
      reason: 'EVENT_NOT_LIVE',
      title: 'Hunt Is Not Active ⏳',
      message: 'The organizers have not started the game yet (or it is currently paused).',
      hint: 'Wait for the host to announce the game is LIVE on the dashboard!',
    })
  }

  // Get the team
  const team = await prisma.team.findUnique({ where: { id: session!.teamId } })
  if (!team || team.eventId !== qrCode.eventId) {
    return NextResponse.json({
      success: false,
      reason: 'INVALID_QR',
      title: 'Different Event QR 🔍',
      message: 'This QR code belongs to a different room or game.',
      hint: 'Please scan clue cards for your team’s current event.',
    })
  }

  if (qrCode.qrType === 'TEAM_STAGE') {
    // Check assigned team
    if (qrCode.assignedTeamId !== session!.teamId) {
      const wrongTeamMessages = [
        `Arre bhai, yeh tumhara QR nahi hai! 🕵️ Apna dhundo!`,
        `Nice try detective! Par yeh tumhare liye nahi hai. Apna trail follow karo! 🗺️`,
        `Oops! Galat QR scan kiya. Tumhara treasure alag jagah chhupta hai! 🙈`,
        `Caught red-handed! 🚨 Yeh QR tumhare liye nahi bana. Back to your own path!`,
        `Mischief managed? Nahi bhai, yeh nahi chalega. Apna QR scan karo! ⚡`,
        `Yeh tumhari lane nahi hai! 🚦 Apni clue dobara padho.`,
      ]
      const msg = wrongTeamMessages[Math.floor(Math.random() * wrongTeamMessages.length)]
      await prisma.scanHistory.create({
        data: {
          eventId: qrCode.eventId,
          teamId: session!.teamId,
          qrCodeId: qrCode.id,
          success: false,
          failureReason: 'QR belongs to another team',
        },
      })
      return NextResponse.json({
        success: false,
        reason: 'WRONG_TEAM',
        title: "Another Team's Clue! 🕵️",
        message: msg,
        hint: qrCode.assignedTeam?.teamName
          ? `This clue was placed for "${qrCode.assignedTeam.teamName}". Your team's clue is hidden in a different spot!`
          : "This clue card belongs to another team. Read your clue description again to find your spot!",
      })
    }

    // Determine expected next stage
    const allProgress = await prisma.teamStageProgress.findMany({
      where: { teamId: session!.teamId },
      orderBy: { stageNumber: 'asc' },
    })

    // Expected stage: first NOT_STARTED or CLUE_ISSUED stage
    let expectedStage = 1
    const releasedStages = allProgress.filter(p => p.status === 'NEXT_CLUE_RELEASED' || p.status === 'COMPLETED')
    if (releasedStages.length > 0) {
      const maxReleased = Math.max(...releasedStages.map(p => p.stageNumber))
      expectedStage = maxReleased + 1
    }

    // Also check if stage 1 itself has been started (for stage 1 logic)
    const stage1 = allProgress.find(p => p.stageNumber === 1)
    if (!stage1 || stage1.status === 'NOT_STARTED') {
      expectedStage = 1
    }

    if (qrCode.stageNumber !== expectedStage) {
      const scannedAhead = qrCode.stageNumber! > expectedStage
      const skipMessages = scannedAhead ? [
        `Arre ruko ruko! 🏃 Seedha yahan mat aao — pehle wala kaam pura karo!`,
        `Itni jaldi kahan? 😅 Order follow karo bhai, shortcuts nahi chalenge!`,
        `Shortcuts nahi chalenge! 😤 Apni clue dobara padho aur sahi jagah jao.`,
        `Usain Bolt ban rahe ho? 🏅 Par rules rules hote hain — sequence follow karo!`,
        `Yeh tumhari baari nahi hai abhi! ⏳ Pehle wala step complete karo.`,
      ] : [
        `Yeh purana QR hai! 🔁 Tum aage nikal chuke ho — apni current clue follow karo.`,
        `Backward mat jao doston! 👀 Apni clue dobara padho aur sahi jagah dhundo.`,
        `Yeh QR tumhare liye expire ho chuka hai! ⏰ Aage badho!`,
      ]
      const msg = skipMessages[Math.floor(Math.random() * skipMessages.length)]
      await prisma.scanHistory.create({
        data: {
          eventId: qrCode.eventId,
          teamId: session!.teamId,
          qrCodeId: qrCode.id,
          success: false,
          failureReason: `Wrong sequence: expected stage ${expectedStage}, got stage ${qrCode.stageNumber}`,
        },
      })
      return NextResponse.json({
        success: false,
        reason: 'WRONG_SEQUENCE',
        title: scannedAhead ? 'Hold on, Detective! ⏳' : 'Stage Already Completed 🔁',
        message: msg,
        hint: scannedAhead
          ? `You must solve Stage ${expectedStage} first before scanning this!`
          : `You are already on Stage ${expectedStage}. Keep following your active clue!`,
      })
    }

    // Check for duplicate scan
    const progress = allProgress.find(p => p.stageNumber === qrCode.stageNumber)
    if (!progress) {
      return NextResponse.json({
        success: false,
        reason: 'INVALID_QR',
        title: 'Stage Not Found',
        message: 'Could not match this clue with your team record.',
      })
    }

    const alreadyScanned = ['QR_SCANNED', 'AWAITING_RECEPTION_VERIFICATION', 'NEXT_CLUE_RELEASED', 'COMPLETED']
    if (alreadyScanned.includes(progress.status)) {
      const dupMessages = [
        `Yaar, yeh QR toh tum pehle hi scan kar chuke ho! 🙄 Aage badho!`,
        `Dobara dobara dobara? 🔄 Ek baar kaafi hai bhai!`,
        `Already done! ✅ Yeh QR complete ho chuka hai — next step pe dhyan do.`,
        `Deja vu? 🌀 Yeh scene tum pehle dekh chuke ho. Aage chalte hain!`,
        `Bhai, yeh toh ho gaya! 😄 Ruko mat, chalte raho!`,
      ]
      const msg = dupMessages[Math.floor(Math.random() * dupMessages.length)]
      await prisma.scanHistory.create({
        data: {
          eventId: qrCode.eventId,
          teamId: session!.teamId,
          qrCodeId: qrCode.id,
          success: false,
          failureReason: 'Already scanned',
        },
      })
      return NextResponse.json({
        success: false,
        reason: 'ALREADY_SCANNED',
        title: 'Already Scanned! ✅',
        message: msg,
        hint: 'Show your 4-digit code at the reception desk to unlock your next clue!',
      })
    }

    // Get the team's clue for this stage to retrieve the result code
    const clue = await prisma.clue.findFirst({
      where: { eventId: qrCode.eventId, teamId: session!.teamId, stageNumber: qrCode.stageNumber },
    })

    await prisma.$transaction(async (tx) => {
      await tx.teamStageProgress.update({
        where: { id: progress.id },
        data: { status: 'AWAITING_RECEPTION_VERIFICATION', scanTimestamp: new Date() },
      })
      await tx.scanHistory.create({
        data: { eventId: qrCode.eventId, teamId: session!.teamId!, qrCodeId: qrCode.id, success: true },
      })
    })

    const isLastStage = qrCode.stageNumber === qrCode.event.stagesPerTeam

    return NextResponse.json({
      success: true,
      resultCode: clue?.resultCode ?? '????',
      isLastStage,
      message: isLastStage
        ? 'Last stage QR scanned! Show this code at reception to unlock your FINAL CLUE!'
        : 'Show this code at reception',
    })
  }

  // COMMON_FINAL
  if (qrCode.qrType === 'COMMON_FINAL') {
    // Verify all team-specific stages are COMPLETED or NEXT_CLUE_RELEASED
    const allProgress = await prisma.teamStageProgress.findMany({
      where: { teamId: session!.teamId },
    })

    const notCompleted = allProgress.filter(
      p => p.status !== 'NEXT_CLUE_RELEASED' && p.status !== 'COMPLETED'
    )
    if (notCompleted.length > 0) {
      const remaining = notCompleted.length
      const finalEarlyMessages = [
        `Galat jagah aa gaye bhai! 🙈 Apni clue dobara padho.`,
        `Yeh tumhara QR nahi hai abhi. Apna trail follow karo! 🗺️`,
        `Oops! Kuch toh gadbad hai. Clue achhi tarah padhi? 🤔`,
        `Yeh scan kaam nahi aaya — apni clue pe wapas jao! 🔙`,
        `Nice try, par yeh wala nahi! 😄 Apna rasta dhundo.`,
      ]
      const msg = finalEarlyMessages[Math.floor(Math.random() * finalEarlyMessages.length)]
      await prisma.scanHistory.create({
        data: {
          eventId: qrCode.eventId,
          teamId: session!.teamId,
          qrCodeId: qrCode.id,
          success: false,
          failureReason: 'Not all stages completed',
        },
      })
      return NextResponse.json({
        success: false,
        reason: 'WRONG_SEQUENCE',
        title: 'Not Ready for Final Yet! 🏆',
        message: msg,
        hint: `You still have ${remaining} stage clue(s) to solve before the Final QR!`,
      })
    }

    if (team.status === 'COMPLETED') {
      return NextResponse.json({
        success: false,
        reason: 'ALREADY_SCANNED',
        title: 'Hunt Already Completed! 🏆',
        message: 'Your team has already crossed the finish line!',
        hint: 'Head to the scoreboard to celebrate your victory!',
      })
    }

    // Mark team and all progress as COMPLETED
    await prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id: session!.teamId },
        data: { status: 'COMPLETED' },
      })

      await tx.teamStageProgress.updateMany({
        where: { teamId: session!.teamId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      await tx.scanHistory.create({
        data: {
          eventId: qrCode.eventId,
          teamId: session!.teamId!,
          qrCodeId: qrCode.id,
          success: true,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Congratulations! You completed the treasure hunt!',
      final: true,
    })
  }

  return NextResponse.json({
    success: false,
    reason: 'INVALID_QR',
    title: 'Unknown QR Type',
    message: 'This QR code is not recognized.',
  })
}
