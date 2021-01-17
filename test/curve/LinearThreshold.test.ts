import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber, Contract, utils } from 'ethers';
import { ethers } from 'hardhat';

chai.use(solidity);

describe('LinearThreshold', () => {
  const WBTC = BigNumber.from(10).pow(8);
  const MIN_SUPPLY = BigNumber.from(0);
  const MAX_SUPPLY = utils.parseEther('250000000');
  const MIN_CEILING = WBTC.mul('101').div('100');
  const MAX_CEILING = WBTC.mul('105').div('100');

  let operator: SignerWithAddress;

  before('provider & accounts setting', async () => {
    [operator] = await ethers.getSigners();
  });

  let linear: Contract;

  before('deploy curve', async () => {
    const Linear = await ethers.getContractFactory('LinearThreshold');
    linear = await Linear.connect(operator).deploy(
      MIN_SUPPLY,
      MAX_SUPPLY,
      MIN_CEILING,
      MAX_CEILING
    );
  });

  it('should work correctly', async () => {
    const iter = 100;
    const width = MAX_SUPPLY.sub(MIN_SUPPLY).div(iter);
    for (let i = 0; i <= iter; i++) {
      const ceiling = await linear.calcCeiling(MIN_SUPPLY.add(width.mul(i)));
      expect(ceiling).to.eq(
        MIN_CEILING.add(
          MAX_CEILING.sub(MIN_CEILING)
            .div(iter)
            .mul(iter - i)
        )
      );
    }
  });

  it('should return max ceiling (supply <= min supply)', async () => {
    const ceiling = await linear.calcCeiling(MIN_SUPPLY);
    expect(ceiling).to.eq(MAX_CEILING);
  });

  it('should return min ceiling (supply >= max supply)', async () => {
    const ceiling = await linear.calcCeiling(MAX_SUPPLY.add(1));
    expect(ceiling).to.eq(MIN_CEILING);
  });
});
