require("@nomicfoundation/hardhat-toolbox");
task('deploy-nonfiat-collateral', 'Deploys a non-fiat Collateral')
  .addParam("balancerPool", "0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56")
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
        BalancerPool: params.balancerPool,
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
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
};
