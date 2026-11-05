import { saveChoiceAwardsCategories, getChoiceAwards, AwardCategory } from '@/lib/choiceAwards'

describe('Choice Awards Multi-Category Preservation', () => {
  const initialCategories: AwardCategory[] = [
    {
      id: 'cat_unit_1',
      orderIndex: 0,
      title: 'First Category (Best Team Player)',
      subtitle: 'Always collaborates well',
      totalVotes: 0,
      nominees: [
        { id: 'nom_1_1', name: 'Alice', role: 'Engineer', avatar: '⭐', photoUrl: null, videoUrl: null, votesCount: 0 },
        { id: 'nom_1_2', name: 'Bob', role: 'Designer', avatar: '🚀', photoUrl: null, videoUrl: null, votesCount: 0 }
      ]
    },
    {
      id: 'cat_unit_2',
      orderIndex: 1,
      title: 'Second Category (Innovator Award)',
      subtitle: 'Brought game-changing ideas',
      totalVotes: 0,
      nominees: [
        { id: 'nom_2_1', name: 'Charlie', role: 'Architect', avatar: '💡', photoUrl: null, videoUrl: null, votesCount: 0 },
        { id: 'nom_2_2', name: 'Diana', role: 'Researcher', avatar: '👑', photoUrl: null, videoUrl: null, votesCount: 0 }
      ]
    }
  ]

  test('saves 2 categories with nominees properly', async () => {
    const saved = await saveChoiceAwardsCategories(initialCategories)
    expect(saved.categories.length).toBe(2)
    expect(saved.categories[0].id).toBe('cat_unit_1')
    expect(saved.categories[0].nominees.length).toBe(2)
    expect(saved.categories[1].id).toBe('cat_unit_2')
    expect(saved.categories[1].nominees.length).toBe(2)
  })

  test('editing the 1st category preserves the 2nd category and all nominees', async () => {
    const state = await getChoiceAwards()
    const updatedCategories: AwardCategory[] = [...state.categories]
    const editingCategory = updatedCategories[0]

    // Simulate user editing title and nominee in modal
    const idx = updatedCategories.findIndex(c => c.id === editingCategory.id)
    updatedCategories[idx] = {
      ...editingCategory,
      title: 'First Category (EDITED & UPDATED)',
      subtitle: 'Updated subtitle',
      nominees: editingCategory.nominees.map(n => ({
        ...n,
        name: n.name + ' [Edited]'
      }))
    }

    const saved = await saveChoiceAwardsCategories(updatedCategories)

    // Verify both categories still exist
    expect(saved.categories.length).toBe(2)

    // Verify category 1 was edited
    expect(saved.categories[0].title).toBe('First Category (EDITED & UPDATED)')
    expect(saved.categories[0].subtitle).toBe('Updated subtitle')
    expect(saved.categories[0].nominees[0].name).toContain('[Edited]')

    // Verify category 2 was completely preserved!
    expect(saved.categories[1].id).toBe('cat_unit_2')
    expect(saved.categories[1].title).toBe('Second Category (Innovator Award)')
    expect(saved.categories[1].nominees.length).toBe(2)
    expect(saved.categories[1].nominees[0].name).toBe('Charlie')
    expect(saved.categories[1].nominees[1].name).toBe('Diana')
  })
})
