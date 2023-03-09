// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
require("@nomicfoundation/hardhat-toolbox");



async function main() {
  console.log('SOOGER', hre.config)
  const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  const unlockTime = currentTimestampInSeconds + 60;

  const lockedAmount = hre.ethers.utils.parseEther("0.001");
  task('deploy-nonfiat-collateral', 'Deploys a non-fiat Collateral')
    .addParam("BalancerPool", "0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56")
    .addParam("priceTimeout", 'The amount of time before a price decays to 0')
    .addParam("referenceUnitFeed", 'Reference Price Feed address')
    .addParam("targetUnitFeed", 'Target Unit Price Feed address')
    .addParam("combinedOracleError", 'The combined % error from both oracle sources')
    .addParam("tokenAddress", 'ERC20 token address')
    .addParam("maxTradeVolume", 'Max Trade Volume (in UoA)')
    .addParam("oracleTimeout", 'Max oracle timeout for the reference unit feed')
    .addParam("targetUnitOracleTimeout", 'Max oracle timeout for the target unit feed')
    .addParam("targetName", 'Target Name')
    .addParam("defaultThreshold", 'Default Threshold')
    .addParam("delayUntilDefault", 'Delay until default')
    .setAction(async (params, hre) => {
      const [deployer] = await hre.ethers.getSigners()

      const chainId = await getChainId(hre)

      const NonFiatCollateralFactory = await hre.ethers.getContractFactory('BalancerLPPlugin')

      const collateral = await NonFiatCollateralFactory.connect(deployer).deploy(
        {
          BalancerPool: params.BalancerPool,
          priceTimeout: params.priceTimeout,
          referenceUnitFeed: params.referenceUnitFeed,
          targetUnitFeed: params.targetUnitFeed,
          combinedOracleError: params.combinedOracleError,
          tokenAddress: params.tokenAddress,
          maxTradeVolume: params.maxTradeVolume,
          oracleTimeout: params.oracleTimeout,
          targetUnitOracleTimeout: params.targetUnitOracleTimeout,
          targetName: params.targetName,
          defaultThreshold: params.defaultThreshold,
          delayUntilDefault: params.delayUntilDefault,
        })
      await collateral.deployed()

      if (!params.noOutput) {
        console.log(
          `Deployed Non-Fiat Collateral to ${hre.network.name} (${chainId}): ${collateral.address}`
        )
      }

      return { collateral: collateral.address }
    })

  // const Lock = await hre.ethers.getContractFactory("BalancerLPPlugin");
  // console.log('PQW', Lock.interface.deploy)
  // const lock = await Lock.deploy([{
  //   value: lockedAmount,
  //   name: 'GEEB',
  //   BalancerPool: "0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56",
  //   priceTimeout: 'The amount of time before a price decays to 0',
  //   referenceUnitFeed: 'Reference Price Feed address',
  //   targetUnitFeed: 'Target Unit Price Feed address',
  //   combinedOracleError: 'The combined % error from both oracle sources',
  //   tokenAddress: 'ERC20 token address',
  //   maxTradeVolume: 'Max Trade Volume (in UoA)',
  //   oracleTimeout: 'Max oracle timeout for the reference unit feed',
  //   targetUnitOracleTimeout: 'Max oracle timeout for the target unit feed',
  //   targetName: 'Target Name',
  //   defaultThreshold: 'Default Threshold',
  //   delayUntilDefault: 'Delay until default',
  // }]);


  // await lock.deployed();
  // console.log('iueu', lock)

  // console.log(
  //   `Lock with ${ethers.utils.formatEther(
  //     lockedAmount
  //   )}ETH and unlock timestamp ${unlockTime} deployed to ${lock.address}`
  // );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
