(function attachFilmsContent(globalScope) {
  // how to add a film: append one object with { id, title, year, runtime, role, statement, youtubeId }.
  const films = [
    {
      id: 'northern-mockingbird',
      title: 'northern mockingbird',
      role: 'director',
      statement: 'finding the bird in a place that no longer remembers it.',
      year: 2025,
      runtime: '3 min',
      youtubeId: '4uJzOTmVHKQ'
    },
    {
      id: 'the-man-who-waters-concrete',
      title: 'the man who waters concrete',
      role: 'director',
      statement: 'an attempt to grow what cannot grow.',
      year: 2025,
      runtime: '2 min',
      youtubeId: 'qaAV4v811j8'
    },
    {
      id: 'bohemian-rhapsody',
      title: 'bohemian rhapsody',
      role: 'director',
      statement: 'a music piece shaped as memory.',
      year: 2025,
      runtime: '15 min',
      youtubeId: '-vp76Gp6zoI'
    },
    {
      id: 'echoes-of-tomorrow',
      title: 'echoes of tomorrow',
      role: 'editor',
      statement: 'stock footage and near futures.',
      year: 2024,
      runtime: '3 min',
      youtubeId: '9pLS3b_b_oM'
    }
  ];

  globalScope.FILMS_DATA = films;
})(window);
