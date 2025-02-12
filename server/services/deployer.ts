import { ethers } from 'ethers';

interface DeploymentResult {
  address: string;
  network: string;
  transactionHash: string;
}

export async function deployContract(
  bytecode: string,
  abi: any[],
  walletAddress: string
): Promise<DeploymentResult> {
  try {
    // Create provider using the user's wallet
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner(walletAddress);

    // Get the network information
    const network = await provider.getNetwork();
    const networkName = network.name.toLowerCase();

    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    // Deploy the contract
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    const deployTransaction = contract.deploymentTransaction();

    if (!deployTransaction) {
      throw new Error('No deployment transaction found');
    }

    return {
      address,
      network: networkName,
      transactionHash: deployTransaction.hash
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
    throw new Error('Deployment failed with unknown error');
  }
}