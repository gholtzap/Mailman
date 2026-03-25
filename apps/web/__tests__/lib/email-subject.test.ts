import { truncateTitle, generateSubjectLine } from '@/lib/email/send-batch-completion'

describe('truncateTitle', () => {
  it('returns short titles unchanged', () => {
    expect(truncateTitle('Short Title', 60)).toBe('Short Title')
  })

  it('truncates at word boundary', () => {
    const title = 'A Novel Approach to Deep Reinforcement Learning for Autonomous Cardiac Surgery Robots'
    const result = truncateTitle(title, 60)
    expect(result.length).toBeLessThanOrEqual(63)
    expect(result).toMatch(/\.\.\.$/)
    expect(result).not.toMatch(/\s\.\.\.$/)
  })

  it('handles single long word gracefully', () => {
    const title = 'Superlongwordthatcannotbesplitanywhereusefully and then more'
    const result = truncateTitle(title, 30)
    expect(result).toMatch(/\.\.\.$/)
    expect(result.length).toBeLessThanOrEqual(33)
  })
})

describe('generateSubjectLine', () => {
  const samplePapers = [
    { title: 'Deep Learning Approaches for Cardiac MRI Segmentation in Pediatric Patients', source: 'arxiv' as const },
    { title: 'Transformer-Based Models for Protein Structure Prediction', source: 'medrxiv' as const },
    { title: 'Attention Mechanisms in Medical Image Analysis', source: 'arxiv' as const },
    { title: 'Graph Neural Networks for Drug Discovery', source: 'arxiv' as const },
    { title: 'Federated Learning in Clinical Settings: A Survey', source: 'medrxiv' as const },
  ]

  const categories = ['Artificial Intelligence', 'Computational Biology']

  it('returns single-paper format for one paper', () => {
    const result = generateSubjectLine([samplePapers[0]], categories, 'My Schedule')
    expect(result).toMatch(/^New paper: /)
    expect(result).toContain('Deep Learning')
  })

  it('generates all template variants', () => {
    const results = new Set<string>()
    const realDateNow = Date.now

    for (let day = 0; day < 5; day++) {
      Date.now = () => day * 86400000
      results.add(generateSubjectLine(samplePapers, categories, 'My Schedule'))
    }

    Date.now = realDateNow

    expect(results.size).toBe(5)

    const allResults = Array.from(results)
    console.log('\n--- Generated Subject Lines ---')
    allResults.forEach((line, i) => console.log(`  Template ${i}: ${line}`))
    console.log('-------------------------------\n')
  })

  it('all templates include category or paper title', () => {
    const realDateNow = Date.now

    for (let day = 0; day < 5; day++) {
      Date.now = () => day * 86400000
      const result = generateSubjectLine(samplePapers, categories, 'Weekly Digest')

      const hasCategoryRef = result.includes('Artificial Intelligence') || result.includes('Computational Biology')
      const hasTitleRef = result.includes('Deep Learning') || result.includes('Cardiac')
      expect(hasCategoryRef || hasTitleRef).toBe(true)
    }

    Date.now = realDateNow
  })

  it('handles single category', () => {
    const realDateNow = Date.now

    for (let day = 0; day < 5; day++) {
      Date.now = () => day * 86400000
      const result = generateSubjectLine(samplePapers, ['Cardiology'], 'Heart Papers')
      expect(result.length).toBeGreaterThan(0)
    }

    Date.now = realDateNow
  })

  it('keeps subject lines under 120 characters', () => {
    const longTitlePapers = [
      { title: 'A Comprehensive Meta-Analysis of Randomized Controlled Trials Evaluating the Efficacy and Safety of Novel mRNA-Based Therapeutic Interventions', source: 'arxiv' as const },
      { title: 'Another Paper', source: 'arxiv' as const },
    ]

    const realDateNow = Date.now

    for (let day = 0; day < 5; day++) {
      Date.now = () => day * 86400000
      const result = generateSubjectLine(longTitlePapers, ['Genomics & Bioinformatics', 'Clinical Medicine'], 'Research Watch')
      expect(result.length).toBeLessThanOrEqual(120)
    }

    Date.now = realDateNow
  })
})
