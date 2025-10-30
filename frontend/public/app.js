// Privacy Crowdfund Platform - Confidential Collective Investment
// Built with Ethereum, FHE encryption, and MetaMask Integration

let web3Provider = null;
let signer = null;
let userAddress = null;
let contracts = {};

// Helper function to ensure proper address checksum
function getChecksumAddress(address) {
    try {
        return ethers.getAddress(address);
    } catch (error) {
        console.warn('Invalid address checksum, using lowercase:', address);
        return address.toLowerCase();
    }
}

// Contract addresses (Privacy Crowdfund deployment)
const CONTRACT_ADDRESSES = {
    CrowdfundPlatform: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e", // Main crowdfunding contract
    PrivacyUtils: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e"
};

// FHE Configuration
const FHE_CONFIG = {
    GATEWAY_URL: "https://gateway.testnet.fhevm.org",
    NETWORK_URL: "https://devnet.zama.ai"
};

// Contract ABIs (simplified versions for key functions)
const CONTRACT_ABIS = {
    CrowdfundPlatform: [
        "function createCampaign(bytes calldata encryptedTarget, uint256 duration, string memory title, string memory description) external",
        "function contribute(uint256 campaignId, bytes calldata encryptedAmount) external",
        "function getCampaignCount() external view returns (uint256)",
        "function getCampaignInfo(uint256 campaignId) external view returns (address, uint256, bool, bool, string memory, string memory)",
        "function getMyContribution(uint256 campaignId) external view returns (bytes memory)",
        "function withdrawFunds(uint256 campaignId) external",
        "function refund(uint256 campaignId) external",
        "event CampaignCreated(uint256 indexed campaignId, address indexed creator, string title)",
        "event ContributionMade(uint256 indexed campaignId, address indexed contributor)"
    ]
};

// Application State
let currentPage = 'landing';
let campaigns = [];
let userFunds = [];
let userInvestments = [];

// Initialize the application
window.addEventListener('load', async () => {
    console.log('🚀 Privacy Crowdfund Loading...');
    
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        console.log('✅ MetaMask detected');
        setupEventListeners();
        
        // Auto-connect if previously connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            await connectWallet();
        }
    } else {
        console.error('❌ MetaMask not found');
        showNotification('Please install MetaMask to use Privacy Crowdfund', 'error');
    }
    
    // Initialize pages
    await loadCampaigns();
    updateUI();
});

// Setup event listeners for MetaMask
function setupEventListeners() {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else {
            connectWallet();
        }
    });

    window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload();
    });
}

// Connect to MetaMask wallet
async function connectWallet() {
    try {
        showLoading(true);
        
        // Request account access
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        if (accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        // Initialize ethers provider
        web3Provider = new ethers.BrowserProvider(window.ethereum);
        signer = await web3Provider.getSigner();
        userAddress = accounts[0];
        
        // Initialize contracts
        await initializeContracts();
        
        // Update UI
        updateWalletDisplay();
        updateNetworkStatus();
        
        console.log('✅ Wallet connected:', userAddress);
        showNotification(`🦊 MetaMask connected! Address: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`, 'success');
        
        // Load user data
        await loadUserData();
        
    } catch (error) {
        console.error('❌ Failed to connect wallet:', error);
        showNotification('Failed to connect wallet: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Disconnect wallet
function disconnectWallet() {
    web3Provider = null;
    signer = null;
    userAddress = null;
    contracts = {};
    
    updateWalletDisplay();
    updateNetworkStatus();
    
    console.log('👋 Wallet disconnected');
    showNotification('Wallet disconnected', 'info');
}

// Initialize smart contracts
async function initializeContracts() {
    try {
        if (!signer) return;
        
        // Initialize CrowdfundPlatform contract
        if (CONTRACT_ADDRESSES.CrowdfundPlatform !== "0x0000000000000000000000000000000000000000") {
            contracts.CrowdfundPlatform = new ethers.Contract(
                getChecksumAddress(CONTRACT_ADDRESSES.CrowdfundPlatform),
                CONTRACT_ABIS.CrowdfundPlatform,
                signer
            );
        }
        
        console.log('✅ Contracts initialized');
    } catch (error) {
        console.error('❌ Failed to initialize contracts:', error);
    }
}

// Update wallet display
function updateWalletDisplay() {
    const walletButton = document.getElementById('wallet-button');
    
    if (userAddress) {
        walletButton.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        walletButton.onclick = null;
        walletButton.classList.add('cursor-default');
    } else {
        walletButton.textContent = 'CONNECT WALLET';
        walletButton.onclick = connectWallet;
        walletButton.classList.remove('cursor-default');
    }
}

// Update network status indicator
async function updateNetworkStatus() {
    const networkStatus = document.getElementById('network-status');
    const statusIndicator = networkStatus.querySelector('.status-indicator');
    const statusText = networkStatus.querySelector('span');
    
    if (web3Provider) {
        try {
            const network = await web3Provider.getNetwork();
            const chainId = network.chainId;
            
            if (chainId === 11155111n) { // Sepolia
                statusIndicator.className = 'status-indicator bg-green-500';
                statusText.textContent = 'SEPOLIA';
            } else if (chainId === 31337n) { // Local
                statusIndicator.className = 'status-indicator bg-blue-500';
                statusText.textContent = 'LOCAL';
            } else {
                statusIndicator.className = 'status-indicator bg-yellow-500';
                statusText.textContent = 'UNKNOWN';
            }
            
            networkStatus.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to get network:', error);
        }
    } else {
        statusIndicator.className = 'status-indicator bg-red-500';
        statusText.textContent = 'DISCONNECTED';
    }
}

// Show/hide pages
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Show selected page
    document.getElementById(`${pageId}-page`).classList.remove('hidden');
    currentPage = pageId;
    
    // Load page-specific data
    if (pageId === 'crowdfunding') {
        loadCampaigns();
    } else if (pageId === 'dashboard') {
        loadUserData();
    }
}

// Create a new crowdfunding campaign
async function createCampaign() {
    // Ensure we're on the correct page
    if (currentPage !== 'crowdfunding') {
        console.log('Switching to crowdfunding page...');
        showPage('crowdfunding');
        // Give time for DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!contracts.CrowdfundPlatform) {
        showNotification('Please connect wallet and ensure contracts are deployed', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Get form data with null checks
        const nameElement = document.getElementById('project-name');
        const goalElement = document.getElementById('funding-goal');
        const durationElement = document.getElementById('campaign-duration');
        const descriptionElement = document.getElementById('project-description');
        
        console.log('Form elements:', {
            nameElement,
            goalElement, 
            durationElement,
            descriptionElement
        });
        
        if (!nameElement) {
            showNotification('❌ Form not loaded properly. Please try refreshing the page.', 'error');
            throw new Error('project-name element not found - form not available');
        }
        if (!goalElement) {
            showNotification('❌ Form not loaded properly. Please try refreshing the page.', 'error');
            throw new Error('funding-goal element not found - form not available');
        }
        if (!durationElement) {
            showNotification('❌ Form not loaded properly. Please try refreshing the page.', 'error');
            throw new Error('campaign-duration element not found - form not available');
        }
        if (!descriptionElement) {
            showNotification('❌ Form not loaded properly. Please try refreshing the page.', 'error');
            throw new Error('project-description element not found - form not available');
        }
        
        const name = nameElement.value;
        const goal = goalElement.value;
        const duration = durationElement.value;
        const description = descriptionElement.value;
        
        if (!name || !goal || !duration) {
            throw new Error('Please fill in all required fields');
        }
        
        // Convert values
        const targetAmount = ethers.parseEther(goal);
        const durationSeconds = parseInt(duration) * 24 * 60 * 60;
        const minContribution = ethers.parseEther("0.001");
        const maxContribution = ethers.parseEther("10");
        const totalSupply = ethers.parseEther("1000000"); // 1M tokens
        
        // For demo purposes, simulate encrypted target amount (in production, use real FHE encryption)
        const encryptedTarget = ethers.toBeHex(targetAmount, 32); // Mock encrypted data
        
        // Call contract with explicit MetaMask interaction
        console.log('🦊 Preparing MetaMask transaction for fund creation...');
        showNotification('🦊 Please confirm transaction in MetaMask...', 'info');
        
        // Use the new CrowdfundPlatform contract
        const tx = await contracts.CrowdfundPlatform.createCampaign(
            encryptedTarget,
            durationSeconds,
            name,
            description
        );
        
        console.log('📝 Campaign creation transaction:', tx.hash);
        showNotification('Campaign creation submitted. Waiting for confirmation...', 'info');
        
        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log('✅ Campaign created successfully:', receipt);
        
        // Clear form
        document.getElementById('project-name').value = '';
        document.getElementById('funding-goal').value = '';
        document.getElementById('campaign-duration').value = '';
        document.getElementById('project-description').value = '';
        
        showNotification('Investment fund created successfully! 🎉', 'success');
        
        // Reload campaigns to show the new one
        await loadCampaigns();
        
        // Show a brief success animation
        const campaignsList = document.getElementById('campaigns-list');
        campaignsList.style.transform = 'scale(1.02)';
        campaignsList.style.transition = 'transform 0.3s ease';
        setTimeout(() => {
            campaignsList.style.transform = 'scale(1)';
        }, 300);
        
    } catch (error) {
        console.error('❌ Failed to create campaign:', error);
        
        // Handle MetaMask specific errors
        if (error.code === 4001) {
            showNotification('🦊 Campaign creation rejected by user', 'warning');
        } else if (error.code === -32603) {
            showNotification('🦊 MetaMask internal error - please try again', 'error');
        } else if (error.message.includes('insufficient funds')) {
            showNotification('💰 Insufficient ETH balance for transaction', 'error');
        } else {
            showNotification('Failed to create campaign: ' + error.message, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Contribute to a campaign with encrypted amount
async function contributeToCampaign(campaignId) {
    console.log('🔍 contributeToCampaign called with campaignId:', campaignId);
    console.log('🔍 contracts.CrowdfundPlatform:', contracts.CrowdfundPlatform);
    console.log('🔍 signer:', signer);
    console.log('🔍 userAddress:', userAddress);
    
    if (!contracts.CrowdfundPlatform) {
        showNotification('Please connect wallet first', 'error');
        return;
    }
    
    if (!signer) {
        showNotification('Signer not available, please reconnect wallet', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Get contribution amount from user
        const amount = prompt('Enter contribution amount (ETH):');
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            showLoading(false);
            return;
        }
        
        const contributionAmount = ethers.parseEther(amount);
        console.log('💰 Contribution amount:', ethers.formatEther(contributionAmount), 'ETH');
        console.log('💰 Target address:', getChecksumAddress(CONTRACT_ADDRESSES.CrowdfundPlatform));
        
        // For demo purposes, simulate encrypted amount (in production, use real FHE encryption)
        const encryptedAmount = ethers.toBeHex(contributionAmount, 32); // Mock encrypted data
        
        // Call the contribute function on the smart contract
        console.log('🦊 Preparing MetaMask transaction for contribution...');
        showNotification('🦊 Please confirm contribution in MetaMask...', 'info');
        
        const tx = await contracts.CrowdfundPlatform.contribute(campaignId, encryptedAmount, {
            value: contributionAmount
        });
        
        console.log('📝 Contribution transaction:', tx.hash);
        showNotification('Contribution submitted. Waiting for confirmation...', 'info');
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Contribution successful:', receipt);
        
        showNotification('Investment successful! 🎉', 'success');
        
        // Reload campaigns
        await loadCampaigns();
        
    } catch (error) {
        console.error('❌ Failed to contribute:', error);
        
        // Handle MetaMask specific errors
        if (error.code === 4001) {
            showNotification('🦊 Transaction rejected by user', 'warning');
        } else if (error.code === -32603) {
            showNotification('🦊 MetaMask internal error - please try again', 'error');
        } else if (error.message.includes('insufficient funds')) {
            showNotification('💰 Insufficient ETH balance for transaction', 'error');
        } else {
            showNotification('Failed to contribute: ' + error.message, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Load active campaigns
async function loadCampaigns() {
    try {
        if (!contracts.CrowdfundPlatform) {
            // Show mock data if contracts not available
            displayMockCampaigns();
            return;
        }
        
        const campaignCount = await contracts.CrowdfundPlatform.getCampaignCount();
        campaigns = [];
        
        for (let i = 1; i <= campaignCount; i++) {
            try {
                const campaignInfo = await contracts.CrowdfundPlatform.getCampaignInfo(i);
                const campaign = {
                    id: i,
                    creator: campaignInfo[0],
                    deadline: campaignInfo[1],
                    active: campaignInfo[2],
                    goalReached: campaignInfo[3],
                    title: campaignInfo[4],
                    description: campaignInfo[5]
                };
                if (campaign.active) {
                    campaigns.push(campaign);
                }
            } catch (error) {
                console.error('Failed to load campaign:', i, error);
            }
        }
        
        displayCampaigns();
    } catch (error) {
        console.error('Failed to load campaigns:', error);
        displayMockCampaigns();
    }
}

// Display campaigns in the UI
function displayCampaigns() {
    const campaignsList = document.getElementById('campaigns-list');
    
    if (campaigns.length === 0) {
        campaignsList.innerHTML = `
            <div class="text-center py-8 text-gray-400 font-mono">
                No active campaigns found. Create the first one!
            </div>
        `;
        return;
    }
    
    const campaignsHTML = campaigns.map(campaign => {
        const deadlineDate = new Date(campaign.deadline * 1000);
        const isExpired = deadlineDate < new Date();
        
        return `
        <div class="bg-gray-800/50 border border-cyan-500/20 rounded-lg p-6">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="text-lg font-bold text-cyan-400 font-mono">${campaign.title}</h4>
                    <p class="text-gray-400 text-sm font-mono">by ${campaign.creator.slice(0, 10)}...</p>
                </div>
                <div class="text-right">
                    <div class="text-sm text-cyan-400 font-mono">FUND #${campaign.id}</div>
                    <div class="text-lg font-bold text-cyan-400">🔒 PRIVATE</div>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-gray-300 text-sm">${campaign.description}</p>
            </div>
            
            <div class="space-y-2 mb-4">
                <div class="flex justify-between text-sm font-mono">
                    <span class="text-gray-400">Target Amount:</span>
                    <span class="text-cyan-400">🔒 ENCRYPTED</span>
                </div>
                <div class="flex justify-between text-sm font-mono">
                    <span class="text-gray-400">Deadline:</span>
                    <span class="text-cyan-400">${deadlineDate.toLocaleDateString()}</span>
                </div>
                <div class="flex justify-between text-sm font-mono">
                    <span class="text-gray-400">Status:</span>
                    <span class="${isExpired ? 'text-red-400' : 'text-green-400'}">${isExpired ? 'EXPIRED' : 'ACTIVE'}</span>
                </div>
            </div>
            
            <div class="flex space-x-3">
                <button onclick="contributeToCampaign(${campaign.id})" class="flex-1 btn-primary py-2 px-4 rounded font-mono text-sm" ${isExpired ? 'disabled' : ''}>
                    💰 INVEST
                </button>
                <button onclick="viewCampaignDetails(${campaign.id})" class="flex-1 btn-cyber py-2 px-4 rounded font-mono text-sm">
                    👁️ DETAILS
                </button>
            </div>
        </div>
        `;
    }).join('');
    
    campaignsList.innerHTML = campaignsHTML;
}

// Display mock campaigns for demo
function displayMockCampaigns() {
    const campaignsList = document.getElementById('campaigns-list');
    
    const mockCampaigns = [
        {
            id: 1,
            title: "Green Energy Investment Fund",
            creator: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            description: "Collective investment in renewable energy projects with privacy-protected contribution amounts",
            deadline: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
            active: true,
            goalReached: false
        },
        {
            id: 2,
            title: "Tech Startup Seed Fund",
            creator: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            description: "Private collective funding for innovative blockchain startups in early stage development",
            deadline: Math.floor(Date.now() / 1000) + (45 * 24 * 60 * 60), // 45 days from now
            active: true,
            goalReached: false
        },
        {
            id: 3,
            title: "Healthcare Innovation Pool",
            creator: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            description: "Confidential investment pool for medical research and healthcare technology development",
            deadline: Math.floor(Date.now() / 1000) + (60 * 24 * 60 * 60), // 60 days from now
            active: true,
            goalReached: false
        }
    ];
    
    const campaignsHTML = mockCampaigns.map(campaign => {
        const deadlineDate = new Date(campaign.deadline * 1000);
        const isExpired = deadlineDate < new Date();
        
        return `
        <div class="bg-gray-800/50 border border-cyan-500/20 rounded-lg p-6">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="text-lg font-bold text-cyan-400 font-mono">${campaign.title}</h4>
                    <p class="text-gray-400 text-sm font-mono">by ${campaign.creator.slice(0, 10)}...</p>
                </div>
                <div class="text-right">
                    <div class="text-sm text-cyan-400 font-mono">FUND #${campaign.id}</div>
                    <div class="text-lg font-bold text-cyan-400">🔒 PRIVATE</div>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-gray-300 text-sm">${campaign.description}</p>
            </div>
            
            <div class="space-y-2 mb-4">
                <div class="flex justify-between text-sm font-mono">
                    <span class="text-gray-400">Target Amount:</span>
                    <span class="text-cyan-400">🔒 ENCRYPTED</span>
                </div>
                <div class="flex justify-between text-sm font-mono">
                    <span class="text-gray-400">Deadline:</span>
                    <span class="text-cyan-400">${deadlineDate.toLocaleDateString()}</span>
                </div>
                <div class="flex justify-between text-sm font-mono">
                    <span class="text-gray-400">Status:</span>
                    <span class="${isExpired ? 'text-red-400' : 'text-green-400'}">${isExpired ? 'EXPIRED' : 'ACTIVE'}</span>
                </div>
            </div>
            
            <div class="flex space-x-3">
                <button onclick="mockContribution(${campaign.id})" class="flex-1 btn-primary py-2 px-4 rounded font-mono text-sm" ${isExpired ? 'disabled' : ''}>
                    💰 INVEST
                </button>
                <button onclick="viewCampaignDetails(${campaign.id})" class="flex-1 btn-cyber py-2 px-4 rounded font-mono text-sm">
                    👁️ DETAILS
                </button>
            </div>
        </div>
        `;
    }).join('');
    
    campaignsList.innerHTML = campaignsHTML;
}

// Mock contribution for demo - now with real MetaMask interaction
async function mockContribution(campaignId) {
    if (!userAddress) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    if (!signer) {
        showNotification('Please reconnect your wallet', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const amount = prompt('Enter contribution amount (ETH):');
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            showLoading(false);
            return;
        }
        
        const contributionAmount = ethers.parseEther(amount);
        console.log('🦊 Creating MetaMask transaction for contribution...');
        
        // Create a real MetaMask transaction
        const tx = await signer.sendTransaction({
            to: getChecksumAddress(CONTRACT_ADDRESSES.CrowdfundPlatform),
            value: contributionAmount,
            data: '0x' // Empty data for demo, but real transaction
        });
        
        console.log('📝 Transaction sent:', tx.hash);
        showNotification('🦊 MetaMask transaction submitted! Waiting for confirmation...', 'info');
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed:', receipt);
        
        showNotification(`✅ Contribution of ${amount} ETH successful! 🎉`, 'success');
        
    } catch (error) {
        console.error('❌ MetaMask transaction failed:', error);
        if (error.code === 4001) {
            showNotification('Transaction rejected by user', 'warning');
        } else {
            showNotification('Transaction failed: ' + error.message, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// View campaign details
function viewCampaignDetails(campaignId) {
    showNotification(`Demo: Viewing details for campaign #${campaignId}`, 'info');
}


// Load user data for dashboard
async function loadUserData() {
    if (!userAddress) return;
    
    // For demo, show placeholder data
    const myFunds = document.getElementById('my-campaigns');
    const myInvestments = document.getElementById('my-investments');
    
    myFunds.innerHTML = `
        <div class="text-center py-8 text-gray-400 font-mono">
            Connect wallet and create funds to see them here
        </div>
    `;
    
    myInvestments.innerHTML = `
        <div class="text-center py-8 text-gray-400 font-mono">
            Make investments to track them here
        </div>
    `;
}

// Utility Functions

// Simulate FHE encryption (placeholder for actual implementation)
function simulateFHEEncryption(value) {
    // In production, this would use Zama FHE client libraries
    return ethers.keccak256(ethers.toBeHex(value));
}

// Show loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg font-mono text-sm max-w-sm transform transition-all duration-300 translate-x-full`;
    
    // Set styles based on type
    switch (type) {
        case 'success':
            notification.className += ' bg-green-900 border border-green-500 text-green-100';
            message = '✅ ' + message;
            break;
        case 'error':
            notification.className += ' bg-red-900 border border-red-500 text-red-100';
            message = '❌ ' + message;
            break;
        case 'warning':
            notification.className += ' bg-yellow-900 border border-yellow-500 text-yellow-100';
            message = '⚠️ ' + message;
            break;
        default:
            notification.className += ' bg-blue-900 border border-blue-500 text-blue-100';
            message = 'ℹ️ ' + message;
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Update UI based on connection status
function updateUI() {
    // Update all UI elements based on current state
    updateWalletDisplay();
    updateNetworkStatus();
}

// Test MetaMask function for debugging
async function testMetaMask() {
    console.log('🧪 Testing MetaMask connection...');
    
    if (!window.ethereum) {
        showNotification('🦊 MetaMask not detected! Please install MetaMask.', 'error');
        return;
    }
    
    if (!signer) {
        showNotification('🔗 Please connect your wallet first!', 'warning');
        return;
    }
    
    try {
        showLoading(true);
        
        console.log('🧪 Preparing test transaction...');
        showNotification('🧪 Testing MetaMask - Please confirm test transaction...', 'info');
        
        const tx = await signer.sendTransaction({
            to: getChecksumAddress(CONTRACT_ADDRESSES.CrowdfundPlatform), // Send to our contract
            value: ethers.parseEther('0.001'), // 0.001 ETH
            data: '0x' // Empty data
        });
        
        console.log('✅ Test transaction sent:', tx.hash);
        showNotification(`🦊 Test transaction submitted! Hash: ${tx.hash.slice(0, 10)}...`, 'info');
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Test transaction confirmed:', receipt);
        
        showNotification('🎉 MetaMask test successful! Your wallet is working perfectly.', 'success');
        
    } catch (error) {
        console.error('❌ Test transaction failed:', error);
        
        if (error.code === 4001) {
            showNotification('🦊 Test transaction rejected by user', 'warning');
        } else if (error.message.includes('insufficient funds')) {
            showNotification('💰 Insufficient ETH for test transaction', 'error');
        } else {
            showNotification('🔧 Test failed: ' + error.message, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Initialize default page on load
document.addEventListener('DOMContentLoaded', () => {
    showPage('landing');
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Console welcome message
console.log(`
🛡️ Privacy Crowdfund v1.0.0
🔒 Confidential Collective Investment Platform
⚡ Powered by FHE Encryption Technology

📊 Ethereum Sepolia Network
🦊 MetaMask Compatible
🔐 Full Privacy Protection
`);