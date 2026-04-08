const ORDINAL_WORDS = {
  1: 'First',
  2: 'Second',
  3: 'Third',
  4: 'Fourth',
  5: 'Fifth',
  6: 'Sixth',
  7: 'Seventh',
  8: 'Eighth',
  9: 'Ninth',
  10: 'Tenth'
};

function lotLabel(index, batchSize) {
  const word = ORDINAL_WORDS[index] || `${index}th`;
  return `${word} lot of ${batchSize} content id's processed successfully`;
}

module.exports = { lotLabel };
