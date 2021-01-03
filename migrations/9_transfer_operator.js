const { readAddresses, writeAddresses } = require('./util');

const Boardroom = artifacts.require('Boardroom');
const Treasury = artifacts.require('Treasury');
const Cash = artifacts.require('Cash');
const Bond = artifacts.require('Bond');
const Share = artifacts.require('Share');
const Timelock = artifacts.require('Timelock');
const SimpleERCFund = artifacts.require('SimpleERCFund');

const DAY = 86400;

module.exports = async (deployer, network, accounts) => {
  const deployedAddresses = readAddresses(network);
  const cash = await Cash.at(deployedAddresses.cash);
  const share = await Share.at(deployedAddresses.share);
  const bond = await Bond.at(deployedAddresses.bond);
  const treasury = await Treasury.at(deployedAddresses.treasury);
  const boardroom = await Boardroom.at(deployedAddresses.boardroom);
  const communityFund = await SimpleERCFund.at(deployedAddresses.communityFund);
  const devFund = await SimpleERCFund.at(deployedAddresses.devFund);
  const timelock = await deployer.deploy(Timelock, accounts[0], 2 * DAY);
  deployedAddresses['timelock'] = timelock.address;

  for await (const contract of [cash, share, bond]) {
    await contract.transferOperator(treasury.address);
    await contract.transferOwnership(treasury.address);
  }
  await boardroom.transferOperator(treasury.address);
  await boardroom.transferOwnership(timelock.address);
  await treasury.transferOperator(timelock.address);
  await treasury.transferOwnership(timelock.address);
  await communityFund.transferOperator(timelock.address);
  await communityFund.transferOwnership(timelock.address);
  await devFund.transferOperator(timelock.address);
  await devFund.transferOwnership(timelock.address);

  console.log(
    `Transferred the operator role from the deployer (${accounts[0]}) to Treasury (${Treasury.address})`
  );

  console.log('Update deployed addresses file with timelock ...');
  await writeAddresses(deployedAddresses, network);
};
