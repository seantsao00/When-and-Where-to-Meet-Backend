const getYYYYMMDD = (date) => {
  return date.toISOString().substring(0, 10);
};

const getHHMISS = (date) => {
  return date.toISOString().substring(11, 19);
};

const getYYYYMMDDHHMISS = (date) => {
  return `${getYYYYMMDD(date)} ${getHHMISS(date)}`;
};

export { getHHMISS, getYYYYMMDD, getYYYYMMDDHHMISS };
