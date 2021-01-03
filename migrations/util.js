const fs = require('fs');
const path = require('path');
const util = require('util');

const writeFile = util.promisify(fs.writeFile);

const readAddresses = (network) => {
  return require(`../deployments/addresses.${network}.json`);
};

const writeAddresses = async (addresses, network) => {
  const writePath = path.resolve(
    __dirname,
    `../deployments/addresses.${network}.json`
  );
  await writeFile(writePath, JSON.stringify(addresses, null, 2));
};

module.exports = {
  readAddresses,
  writeAddresses,
};
