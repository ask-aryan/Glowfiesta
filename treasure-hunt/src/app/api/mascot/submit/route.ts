import { NextRequest, NextResponse } from 'next/server'
import { saveMascotSubmission } from '@/lib/mascot'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_FILE_SIZE = 35 * 1024 * 1024 // 35 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const employeeName = (formData.get('employeeName') as string || '').trim()
    const title = (formData.get('title') as string || '').trim()
    const thoughtBehind = (formData.get('thoughtBehind') as string || '').trim()
    const file = formData.get('file') as File | null

    // Validations
    if (!employeeName || employeeName.length < 2) {
      return NextResponse.json({
        success: false,
        message: 'Please provide your full employee name.',
      }, { status: 400 })
    }

    if (!title || title.length < 2) {
      return NextResponse.json({
        success: false,
        message: 'Please provide a title or name for your 3D mascot model.',
      }, { status: 400 })
    }

    if (!thoughtBehind || thoughtBehind.length < 5) {
      return NextResponse.json({
        success: false,
        message: 'Please describe the thought, inspiration, or symbolism behind your mascot.',
      }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({
        success: false,
        message: 'No file was selected. Please attach your 3D model (.stl), design image (.png/.jpg), or PDF document.',
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        message: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 35 MB upload limit. Please contact the Event Committee to submit your large file directly!`,
        contactCommittee: true,
      }, { status: 413 })
    }

    // Read file bytes and convert to base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Data = buffer.toString('base64')

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'stl'
    const cleanFileName = file.name || `artverse_mascot_${Date.now()}.${fileExt}`

    let detectedType = file.type
    if (!detectedType || detectedType === 'application/octet-stream') {
      if (['jpg', 'jpeg'].includes(fileExt)) detectedType = 'image/jpeg'
      else if (fileExt === 'png') detectedType = 'image/png'
      else if (fileExt === 'webp') detectedType = 'image/webp'
      else if (fileExt === 'gif') detectedType = 'image/gif'
      else if (fileExt === 'pdf') detectedType = 'application/pdf'
      else if (fileExt === 'stl') detectedType = 'model/stl'
      else detectedType = `model/${fileExt}`
    }

    const submissionId = `mascot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    await saveMascotSubmission({
      id: submissionId,
      employeeName,
      title,
      thoughtBehind,
      fileName: cleanFileName,
      fileSize: file.size,
      fileType: detectedType,
      fileData: base64Data,
      submittedAt: Date.now(),
    })

    return NextResponse.json({
      success: true,
      submissionId,
      message: 'Mascot design submitted successfully! Thank you for participating in Artverse.',
    })
  } catch (err: any) {
    console.error('Error submitting mascot model:', err)
    return NextResponse.json({
      success: false,
      message: err.message || 'An unexpected error occurred while processing the 3D file. Please contact the Event Committee.',
      contactCommittee: true,
    }, { status: 500 })
  }
}
