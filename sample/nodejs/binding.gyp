{
  'conditions': [
    ['OS=="win"', {
      'variables': {
      }
    }]
  ],
  
  'targets': [
    {
      'target_name': 'lsdisplay',
      'sources': [ 'lsdisplay2_wrap.cc' ],
      'conditions': [
        ['OS=="win"', {
          'libraries': [
            '-l../../lib/lsdisplay2.lib'
          ]
        }]
      ]
    }
  ]
}