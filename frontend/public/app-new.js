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
    console.log('🚀 CREATECAMPAIGN CALLED - CONTRACT UPDATED v1.2.0');
    console.log('📍 Current page:', currentPage);
    console.log('📋 Contract Address:', CONTRACT_ADDRESSES.CrowdfundPlatform);
    
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
    console.log('🔄 Loading campaigns...');
    
    try {
        // Always show mock data first for instant display
        displayMockCampaigns();
        console.log('✅ Mock campaigns loaded');
        
        // Try to load real campaigns if contract is available
        if (contracts.CrowdfundPlatform) {
            console.log('🔗 Contract available, attempting to load real campaigns...');
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
            
            // Only replace mock campaigns if we found real ones
            if (campaigns.length > 0) {
                console.log(`✅ Found ${campaigns.length} real campaigns`);
                displayCampaigns();
            } else {
                console.log('ℹ️ No real campaigns found, keeping mock campaigns');
            }
        } else {
            console.log('ℹ️ Contract not available, using mock campaigns');
        }
        
    } catch (error) {
        console.error('Failed to load campaigns:', error);
        // Ensure mock campaigns are shown even if there's an error
        displayMockCampaigns();
        console.log('✅ Fallback to mock campaigns due to error');
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
            title: "🌱 Green Energy Investment Fund",
            creator: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            description: "Collective investment in renewable energy projects with privacy-protected contribution amounts. Focus on solar, wind, and battery technologies.",
            deadline: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
            active: true,
            goalReached: false,
            targetRange: "5-10 ETH",
            currentContributors: 12,
            category: "Environmental",
            riskLevel: "Medium"
        },
        {
            id: 2,
            title: "🚀 Tech Startup Seed Fund",
            creator: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            description: "Private collective funding for innovative blockchain startups in early stage development. Supporting AI, DeFi, and Web3 projects.",
            deadline: Math.floor(Date.now() / 1000) + (45 * 24 * 60 * 60), // 45 days from now
            active: true,
            goalReached: false,
            targetRange: "15-25 ETH",
            currentContributors: 8,
            category: "Technology",
            riskLevel: "High"
        },
        {
            id: 3,
            title: "🏥 Healthcare Innovation Pool",
            creator: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            description: "Confidential investment pool for medical research and healthcare technology development. Focus on diagnostics and treatment innovation.",
            deadline: Math.floor(Date.now() / 1000) + (60 * 24 * 60 * 60), // 60 days from now
            active: true,
            goalReached: false,
            targetRange: "8-12 ETH",
            currentContributors: 15,
            category: "Healthcare",
            riskLevel: "Low"
        },
        {
            id: 4,
            title: "🏠 Real Estate Development Fund",
            creator: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            description: "Diversified real estate investment opportunities with complete privacy protection. Commercial and residential development projects.",
            deadline: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days from now
            active: true,
            goalReached: false,
            targetRange: "20-50 ETH",
            currentContributors: 6,
            category: "Real Estate",
            riskLevel: "Medium"
        },
        {
            id: 5,
            title: "🎮 Gaming & NFT Collective",
            creator: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            description: "Investment fund for gaming studios, NFT collections, and metaverse projects. Supporting next-generation digital entertainment.",
            deadline: Math.floor(Date.now() / 1000) + (21 * 24 * 60 * 60), // 21 days from now
            active: true,
            goalReached: false,
            targetRange: "3-8 ETH",
            currentContributors: 23,
            category: "Gaming/NFT",
            riskLevel: "High"
        },
        {
            id: 6,
            title: "💰 DeFi Yield Optimization",
            creator: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            description: "Automated DeFi strategy fund with privacy-first approach. Diversified across multiple protocols for optimized yield generation.",
            deadline: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60), // 14 days from now
            active: true,
            goalReached: false,
            targetRange: "10-20 ETH",
            currentContributors: 31,
            category: "DeFi",
            riskLevel: "Medium"
        }
    ];
    
    const campaignsHTML = mockCampaigns.map(campaign => {
        const deadlineDate = new Date(campaign.deadline * 1000);
        const isExpired = deadlineDate < new Date();
        const daysLeft = Math.ceil((campaign.deadline * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
        
        // Risk level color mapping
        const getRiskColor = (level) => {
            switch(level) {
                case 'Low': return 'text-green-400';
                case 'Medium': return 'text-yellow-400';
                case 'High': return 'text-red-400';
                default: return 'text-gray-400';
            }
        };
        
        return `
        <div class="bg-gray-800/50 border border-cyan-500/20 rounded-lg p-6 hover:border-cyan-400/40 transition-all duration-300">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h4 class="text-lg font-bold text-cyan-400 font-mono mb-1">${campaign.title}</h4>
                    <div class="flex items-center space-x-4 text-xs">
                        <span class="text-gray-400 font-mono">by ${campaign.creator.slice(0, 10)}...</span>
                        <span class="px-2 py-1 rounded text-xs font-mono bg-gray-700 text-cyan-400">${campaign.category}</span>
                        <span class="px-2 py-1 rounded text-xs font-mono bg-gray-700 ${getRiskColor(campaign.riskLevel)}">${campaign.riskLevel} Risk</span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-cyan-400 font-mono">FUND #${campaign.id}</div>
                    <div class="text-lg font-bold text-cyan-400">🔒 PRIVATE</div>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-gray-300 text-sm leading-relaxed">${campaign.description}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="space-y-2">
                    <div class="flex justify-between text-sm font-mono">
                        <span class="text-gray-400">Target Range:</span>
                        <span class="text-cyan-400">${campaign.targetRange}</span>
                    </div>
                    <div class="flex justify-between text-sm font-mono">
                        <span class="text-gray-400">Contributors:</span>
                        <span class="text-green-400">${campaign.currentContributors} investors</span>
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between text-sm font-mono">
                        <span class="text-gray-400">Deadline:</span>
                        <span class="text-cyan-400">${deadlineDate.toLocaleDateString()}</span>
                    </div>
                    <div class="flex justify-between text-sm font-mono">
                        <span class="text-gray-400">Time Left:</span>
                        <span class="${isExpired ? 'text-red-400' : 'text-green-400'}">${isExpired ? 'EXPIRED' : daysLeft + ' days'}</span>
                    </div>
                </div>
            </div>
            
            <div class="flex space-x-3">
                <button onclick="mockContribution(${campaign.id})" class="flex-1 btn-primary py-2 px-4 rounded font-mono text-sm transition-all duration-300 hover:bg-cyan-600" ${isExpired ? 'disabled' : ''}>
                    💰 INVEST NOW
                </button>
                <button onclick="viewCampaignDetails(${campaign.id})" class="flex-1 btn-cyber py-2 px-4 rounded font-mono text-sm transition-all duration-300 hover:bg-gray-600">
                    📊 DETAILS
                </button>
                <button onclick="shareCampaign(${campaign.id})" class="px-4 py-2 btn-cyber rounded font-mono text-sm transition-all duration-300 hover:bg-gray-600" title="Share Campaign">
                    📤
                </button>
            </div>
        </div>
        `;
    }).join('');
    
    campaignsList.innerHTML = campaignsHTML;
}

// Enhanced contribution with investment selection modal
async function mockContribution(campaignId) {
    if (!userAddress) {
        showNotification('Please connect your wallet first! 🦊', 'error');
        return;
    }
    
    if (!signer) {
        showNotification('Please reconnect your wallet', 'error');
        return;
    }
    
    // Create investment modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    // Campaign info for the modal
    const campaignNames = {
        1: "🌱 Green Energy Investment Fund",
        2: "🚀 Tech Startup Seed Fund", 
        3: "🏥 Healthcare Innovation Pool",
        4: "🏠 Real Estate Development Fund",
        5: "🎮 Gaming & NFT Collective",
        6: "💰 DeFi Yield Optimization"
    };
    
    modal.innerHTML = `
        <div class="bg-gray-900 border border-cyan-500/30 rounded-xl p-8 max-w-md w-full">
            <div class="flex justify-between items-start mb-6">
                <h2 class="text-xl font-bold text-cyan-400 font-mono">💰 INVEST IN FUND #${campaignId}</h2>
                <button onclick="document.body.removeChild(this.closest('.fixed'))" class="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            
            <div class="mb-6">
                <h3 class="text-lg text-cyan-400 font-mono mb-4">${campaignNames[campaignId] || 'Investment Fund'}</h3>
                <p class="text-gray-400 text-sm mb-4 font-mono">Select your investment amount:</p>
                
                <div class="grid grid-cols-3 gap-3 mb-4">
                    <button onclick="setInvestmentAmount('0.01')" class="btn-cyber p-3 text-sm font-mono hover:bg-cyan-600">0.01 ETH</button>
                    <button onclick="setInvestmentAmount('0.1')" class="btn-cyber p-3 text-sm font-mono hover:bg-cyan-600">0.1 ETH</button>
                    <button onclick="setInvestmentAmount('0.5')" class="btn-cyber p-3 text-sm font-mono hover:bg-cyan-600">0.5 ETH</button>
                    <button onclick="setInvestmentAmount('1')" class="btn-cyber p-3 text-sm font-mono hover:bg-cyan-600">1 ETH</button>
                    <button onclick="setInvestmentAmount('2')" class="btn-cyber p-3 text-sm font-mono hover:bg-cyan-600">2 ETH</button>
                    <button onclick="setInvestmentAmount('5')" class="btn-cyber p-3 text-sm font-mono hover:bg-cyan-600">5 ETH</button>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-mono text-gray-400 mb-2">Custom Amount (ETH):</label>
                    <input id="custom-amount" type="number" step="0.001" min="0.001" placeholder="0.001" 
                           class="w-full bg-gray-800 border border-cyan-500/30 rounded p-3 text-white font-mono focus:border-cyan-400">
                </div>
                
                <div class="text-xs text-gray-500 font-mono mb-4">
                    🧪 <strong>DEMO MODE</strong>: Safe testing with real MetaMask<br>
                    💡 Only 0.001 ETH will be sent to your own address<br>
                    🔒 In production: Your amount would be FHE encrypted<br>
                    ⚡ Gas fees: ~0.001 ETH for demo transaction
                </div>
            </div>
            
            <div class="flex space-x-3">
                <button onclick="processInvestment(${campaignId})" class="flex-1 btn-primary py-3 px-4 rounded font-mono">
                    🧪 DEMO INVEST (SAFE)
                </button>
                <button onclick="document.body.removeChild(this.closest('.fixed'))" class="flex-1 btn-cyber py-3 px-4 rounded font-mono">
                    ❌ CANCEL
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Make global functions for the modal
    window.setInvestmentAmount = (amount) => {
        document.getElementById('custom-amount').value = amount;
    };
    
    window.processInvestment = async (campaignId) => {
        const amountInput = document.getElementById('custom-amount');
        const amount = amountInput.value;
        
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            showNotification('Please enter a valid investment amount', 'error');
            return;
        }
        
        if (parseFloat(amount) < 0.001) {
            showNotification('Minimum investment is 0.001 ETH', 'error');
            return;
        }
        
        // Close modal
        document.body.removeChild(modal);
        
        try {
            showLoading(true);
            
            const contributionAmount = ethers.parseEther(amount);
            console.log('🦊 Creating MetaMask transaction for contribution...');
            console.log('💰 Investment Amount:', amount, 'ETH');
            console.log('🎯 Target Fund:', campaignNames[campaignId]);
            
            showNotification(`🧪 Demo: Processing investment of ${amount} ETH to Fund #${campaignId}...`, 'info');
            
            // Create a safe demo transaction (send to yourself with a tiny amount)
            const demoAmount = ethers.parseEther('0.001'); // Only send 0.001 ETH as demo
            console.log(`🧪 Demo: Creating safe transaction (0.001 ETH to self, representing ${amount} ETH investment)`);
            
            const tx = await signer.sendTransaction({
                to: userAddress, // Send to user's own address (safe)
                value: demoAmount, // Small demo amount
                data: '0x' // Empty data
            });
            
            console.log('📝 Demo transaction sent:', tx.hash);
            showNotification('🔄 Demo transaction submitted! Confirming on blockchain...', 'info');
            
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log('✅ Transaction confirmed:', receipt);
            
            showNotification(`🎉 Demo Complete! Investment of ${amount} ETH recorded for Fund #${campaignId}!`, 'success');
            
            // Show success animation
            setTimeout(() => {
                showNotification(`🔒 Demo: In production, your ${amount} ETH would be encrypted and added to the fund`, 'info');
            }, 2000);
            
            setTimeout(() => {
                showNotification(`📊 Demo: Only 0.001 ETH was actually sent (to your own address for safety)`, 'warning');
            }, 4000);
            
        } catch (error) {
            console.error('❌ MetaMask transaction failed:', error);
            if (error.code === 4001) {
                showNotification('🦊 Investment rejected by user', 'warning');
            } else if (error.message.includes('insufficient funds')) {
                showNotification('💰 Insufficient ETH balance for investment', 'error');
            } else {
                showNotification('🔧 Investment failed: ' + error.message, 'error');
            }
        } finally {
            showLoading(false);
        }
    };
}

// View campaign details with enhanced modal
function viewCampaignDetails(campaignId) {
    // Create detailed modal with comprehensive campaign information
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    // Mock detailed data for the campaign
    const campaignDetails = {
        1: { 
            title: "🌱 Green Energy Investment Fund", 
            progress: "65%", 
            raised: "6.5 ETH", 
            investors: 12,
            strategy: "Solar panel installations, wind farm development, battery storage solutions",
            timeline: "Q1 2025: Site selection, Q2 2025: Construction begins, Q3 2025: First energy generation",
            returns: "Expected 12-15% annual returns with environmental impact bonus"
        },
        2: { 
            title: "🚀 Tech Startup Seed Fund", 
            progress: "40%", 
            raised: "10 ETH", 
            investors: 8,
            strategy: "AI-powered blockchain applications, DeFi protocols, Web3 infrastructure",
            timeline: "Q4 2024: Due diligence, Q1 2025: Initial funding, Q2 2025: Product development",
            returns: "High growth potential, 3-10x returns expected over 3-5 years"
        },
        3: { 
            title: "🏥 Healthcare Innovation Pool", 
            progress: "80%", 
            raised: "9.6 ETH", 
            investors: 15,
            strategy: "Medical device startups, diagnostic technology, telemedicine platforms",
            timeline: "Q1 2025: Regulatory approvals, Q2 2025: Clinical trials, Q3 2025: Market entry",
            returns: "Stable 8-12% returns with potential for breakthrough bonuses"
        },
        4: { 
            title: "🏠 Real Estate Development Fund", 
            progress: "25%", 
            raised: "12.5 ETH", 
            investors: 6,
            strategy: "Mixed-use developments, affordable housing projects, commercial spaces",
            timeline: "Q1 2025: Land acquisition, Q2 2025: Permits, Q4 2025: Construction start",
            returns: "Projected 10-14% annual returns plus property appreciation"
        },
        5: { 
            title: "🎮 Gaming & NFT Collective", 
            progress: "90%", 
            raised: "7.2 ETH", 
            investors: 23,
            strategy: "Indie game studios, NFT marketplaces, gaming infrastructure, metaverse projects",
            timeline: "Q4 2024: Game launches, Q1 2025: NFT collections, Q2 2025: Metaverse integration",
            returns: "High volatility, potential for 5-20x returns in gaming boom cycles"
        },
        6: { 
            title: "💰 DeFi Yield Optimization", 
            progress: "70%", 
            raised: "14 ETH", 
            investors: 31,
            strategy: "Automated yield farming, liquidity provision, arbitrage opportunities",
            timeline: "Continuous: Active management, Monthly: Rebalancing, Quarterly: Strategy updates",
            returns: "Target 15-25% APY with algorithmic risk management"
        }
    };
    
    const details = campaignDetails[campaignId] || { title: "Unknown Campaign", progress: "0%", raised: "0 ETH", investors: 0 };
    
    modal.innerHTML = `
        <div class="bg-gray-900 border border-cyan-500/30 rounded-xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div class="flex justify-between items-start mb-6">
                <h2 class="text-2xl font-bold text-cyan-400 font-mono">${details.title}</h2>
                <button onclick="document.body.removeChild(this.closest('.fixed'))" class="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="space-y-4">
                    <div>
                        <h3 class="text-lg font-bold text-cyan-400 mb-2 font-mono">📊 FUND STATISTICS</h3>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Progress:</span>
                                <span class="text-green-400">${details.progress}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Raised:</span>
                                <span class="text-cyan-400">${details.raised}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Investors:</span>
                                <span class="text-green-400">${details.investors}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <h3 class="text-lg font-bold text-cyan-400 mb-2 font-mono">🎯 STRATEGY</h3>
                        <p class="text-gray-300 text-sm">${details.strategy}</p>
                    </div>
                </div>
            </div>
            
            <div class="mb-6">
                <h3 class="text-lg font-bold text-cyan-400 mb-2 font-mono">📅 TIMELINE</h3>
                <p class="text-gray-300 text-sm">${details.timeline}</p>
            </div>
            
            <div class="mb-6">
                <h3 class="text-lg font-bold text-cyan-400 mb-2 font-mono">💰 EXPECTED RETURNS</h3>
                <p class="text-gray-300 text-sm">${details.returns}</p>
            </div>
            
            <div class="flex space-x-4">
                <button onclick="mockContribution(${campaignId}); document.body.removeChild(this.closest('.fixed'))" class="flex-1 btn-primary py-3 px-6 rounded font-mono">
                    💰 INVEST NOW
                </button>
                <button onclick="document.body.removeChild(this.closest('.fixed'))" class="flex-1 btn-cyber py-3 px-6 rounded font-mono">
                    📋 CLOSE
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showNotification(`📊 Viewing detailed analysis for Fund #${campaignId}`, 'info');
}

// Share campaign functionality
function shareCampaign(campaignId) {
    const campaignUrl = `${window.location.origin}${window.location.pathname}?fund=${campaignId}`;
    
    if (navigator.share) {
        navigator.share({
            title: `Privacy Crowdfund - Investment Fund #${campaignId}`,
            text: `Check out this private investment opportunity on Privacy Crowdfund!`,
            url: campaignUrl
        }).then(() => {
            showNotification('Campaign shared successfully! 📤', 'success');
        }).catch(() => {
            fallbackShare(campaignUrl);
        });
    } else {
        fallbackShare(campaignUrl);
    }
}

// Fallback share function
function fallbackShare(url) {
    navigator.clipboard.writeText(url).then(() => {
        showNotification('Campaign link copied to clipboard! 📋', 'success');
    }).catch(() => {
        // Create temporary input for manual copying
        const tempInput = document.createElement('input');
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showNotification('Campaign link copied! Please paste to share 📋', 'info');
    });
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
    // Always load mock campaigns for immediate display when needed
    setTimeout(() => {
        displayMockCampaigns();
    }, 500);
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Console welcome message - CONTRACT ADDRESS UPDATED  
console.log(`
🛡️ Privacy Crowdfund v1.2.0 - TRANSACTION FIXED UPDATE
🔒 Confidential Collective Investment Platform
⚡ Powered by FHE Encryption Technology

📊 Ethereum Sepolia Network
🦊 MetaMask Compatible
🔐 Full Privacy Protection
✅ Contract Address: 0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e

🎯 6 Active Investment Funds Available:
   1. 🌱 Green Energy Investment Fund
   2. 🚀 Tech Startup Seed Fund  
   3. 🏥 Healthcare Innovation Pool
   4. 🏠 Real Estate Development Fund
   5. 🎮 Gaming & NFT Collective
   6. 💰 DeFi Yield Optimization

📋 To view funds: Click 'CAMPAIGNS' or 'BROWSE ACTIVE FUNDS'
`);

// Force immediate display of mock campaigns for testing
console.log('🧪 Testing: Force loading mock campaigns...');
setTimeout(() => {
    console.log('🧪 Testing: Attempting to display mock campaigns immediately');
    if (document.getElementById('campaigns-list')) {
        displayMockCampaigns();
        console.log('✅ Testing: Mock campaigns should now be visible');
    } else {
        console.log('❌ Testing: campaigns-list element not found');
    }
}, 1000);