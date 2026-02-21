//store films
(function attachFilmsContent(globalScope) {
  const films = [
    {
      youtubeId: '4uJzOTmVHKQ',
      title: 'northern mockingbird',
      year: '2025',
      runtime: '3 min',
      role: 'director',
      statement: 'finding the bird in a place that no longer remembers it.'
    },
    {
      youtubeId: 'qaAV4v811j8',
      title: 'the man who waters concrete',
      year: '2025',
      runtime: '2 min',
      role: 'director',
      statement: 'an attempt to grow what cannot grow.'
    },
    {
      youtubeId: '-vp76Gp6zoI',
      title: 'bohemian rhapsody',
      year: '2025',
      runtime: '5 min',
      role: 'director',
      statement: 'a music piece shaped as memory.'
    },
    {
      youtubeId: '9pLS3b_b_oM',
      title: 'echoes of tomorrow',
      year: '2024',
      runtime: '3 min',
      role: 'editor',
      statement: 'stock footage and near futures.'
    }
  ];

  globalScope.FILMS_DATA = films;
})(window);
