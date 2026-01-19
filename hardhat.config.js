require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();  // 加载 .env 文件的环境变量
require("@openzeppelin/hardhat-upgrades");  // 支持可升级合约
require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.0",  // 你的默认版本
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      // 添加其他 Solidity 版本，例如用于不同合约
      // {
      //   version: "0.8.20",
      //   settings: {
      //     optimizer: {
      //       enabled: true,
      //       runs: 200,
      //     },
      //   },
      // },
      // 可以继续添加更多版本
    ],
    overrides: {
      "contracts/Lock.sol": {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          }
        },
      },
    },
  },
  networks: {
    hardhat: {
      // 本地开发网络，默认即可
    },
    localhost: {
      // 本地节点
    },
    sepolia: {  // 示例：Sepolia 测试网，使用 .env 中的变量
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",  // 备用 URL
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // 可以添加主网或其他网络，同样使用 process.env
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },

  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,  // 从 .env 读取
      // 可以添加其他链，如 polygon: process.env.POLYGONSCAN_API_KEY
    },
  }
};