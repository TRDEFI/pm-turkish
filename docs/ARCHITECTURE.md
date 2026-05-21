# TRDEFI Architecture

System architecture documentation for the TRDEFI Prediction Market platform.

---

## System Overview

```mermaid
graph TB
    subgraph Users["Users"]
        U1[User 1]
        U2[User 2]
        U3[User N]
    end

    subgraph Frontend["Frontend (Next.js)"]
        UI[User Interface]
        WC[Wallet Connection]
        EC[Event Cards]
        BB[Bet Buttons]
        WD[Wallet Display]
    end

    subgraph Blockchain["Polygon Blockchain"]
        VC[TRDEFIVault Contract]
        ERC[EventResolver Contract]
        DMC[DepositManager Contract]
        USDC[USDC Token]
    end

    subgraph OffChain["Off-Chain Services"]
        LLM[LLM Engine]
        MP[MoonPay Agent]
        DB[(Supabase Database)]
        NF[Netlify Functions]
    end

    Users --> UI
    UI --> WC
    WC --> VC
    UI --> EC
    UI --> BB
    UI --> WD
    BB --> VC
    WD --> VC
    VC --> USDC
    ERC --> VC
    DMC --> VC
    LLM --> ERC
    MP --> DMC
    DB --> NF
    NF --> VC
    NF --> DB
```

---

## Component Architecture

### Frontend Layer

```mermaid
graph LR
    subgraph NextJS["Next.js Application"]
        Pages[Pages]
        Components[Components]
        Hooks[Custom Hooks]
        Utils[Utilities]
    end

    subgraph Web3["Web3 Integration"]
        Wagmi[Wagmi]
        Viem[Viem]
        ConnectKit[ConnectKit]
    end

    subgraph State["State Management"]
        ReactQuery[React Query]
        Zustand[Zustand]
    end

    Pages --> Components
    Components --> Hooks
    Hooks --> Utils
    Components --> Web3
    Web3 --> State
    State --> Pages
```

**Key Components:**
- `EventCard`: Displays event details, betting options, and status
- `WalletConnect`: Handles wallet connection and disconnection
- `BetModal`: Modal for placing bets with amount input
- `TransactionHistory`: Displays user's transaction history
- `DepositModal`: Modal for depositing USDC via MoonPay

---

### Smart Contract Layer

```mermaid
graph TB
    subgraph Vault["TRDEFIVault.sol"]
        Deposit[deposit()]
        Withdraw[withdraw()]
        CreateEvent[createEvent()]
        PlaceBet[placeBet()]
        Resolve[resolveEvent()]
        Claim[claimWinnings()]
    end

    subgraph Resolver["EventResolver.sol"]
        Submit[submitResolution()]
        Confirm[confirmResolution()]
        Challenge[challengeResolution()]
        Finalize[finalizeAfterTimeout()]
    end

    subgraph DepositMgr["TRDEFIDepositManager.sol"]
        MPDeposit[deposit()]
        Credit[creditDeposit()]
        BatchCredit[batchCreditDeposits()]
    end

    Resolver --> Vault
    DepositMgr --> Vault
    Vault --> USDC[USDC Token]
```

**Contract Interactions:**
1. User deposits USDC → `TRDEFIVault.deposit()`
2. Owner creates event → `TRDEFIVault.createEvent()`
3. User places bet → `TRDEFIVault.placeBet()`
4. LLM submits resolution → `EventResolver.submitResolution()`
5. Signers confirm/challenge → `EventResolver.confirmResolution()`
6. Event resolved → `TRDEFIVault.resolveEvent()`
7. User claims winnings → `TRDEFIVault.claimWinnings()`

---

### Off-Chain Services

```mermaid
graph TB
    subgraph LLMEngine["LLM Engine"]
        EG[Event Generator]
        FC[Fact Checker]
        ARB[Arbiter]
        WM[Wallet Manager]
    end

    subgraph DataSources["Data Sources"]
        GT[Google Trends]
        RSS[News RSS]
        MGM[MGM API]
        BIST[Borsa Istanbul]
    end

    subgraph MoonPay["MoonPay Integration"]
        Webhook[Webhook Handler]
        KYC[KYC/AML Check]
        Transfer[USDC Transfer]
    end

    subgraph Database["Supabase"]
        Events[Events Table]
        Bets[Bets Table]
        Users[Users Table]
        Audit[Audit Log]
    end

    DataSources --> EG
    EG --> FC
    FC --> ARB
    ARB --> WM
    WM --> Database
    Webhook --> KYC
    KYC --> Transfer
    Transfer --> Database
```

---

## Data Flow

### User Betting Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Vault
    participant USDC
    participant Database

    User->>Frontend: Connect Wallet
    Frontend->>Vault: Check Balance
    Vault-->>Frontend: Return Balance
    Frontend-->>User: Display Balance

    User->>Frontend: Place Bet (YES/NO)
    Frontend->>USDC: Approve Spending
    USDC-->>Frontend: Approval Confirmed
    Frontend->>Vault: placeBet(eventId, side, amount)
    Vault->>USDC: Transfer USDC
    USDC-->>Vault: Transfer Complete
    Vault-->>Frontend: Bet Placed
    Frontend->>Database: Log Bet
    Frontend-->>User: Confirmation
```

### Event Resolution Flow

```mermaid
sequenceDiagram
    participant LLM
    participant Resolver
    participant Vault
    participant Signers
    participant Users

    LLM->>Resolver: submitResolution(eventId, yes, reasoning, sources)
    Resolver-->>LLM: Resolution Submitted (PENDING)

    Note over Signers: 24h Challenge Window

    Signers->>Resolver: confirmResolution(resolutionId)
    Resolver-->>Signers: Confirmation Recorded

    alt 2+ Confirmations
        Resolver->>Vault: finalizeResolution()
        Vault-->>Resolver: Event Resolved
    else Challenge Window Expires
        Anyone->>Resolver: finalizeAfterTimeout(resolutionId)
        Resolver->>Vault: finalizeResolution()
        Vault-->>Resolver: Event Resolved
    else Majority Challenge
        Resolver->>Vault: rejectResolution()
        Vault-->>Resolver: Event Rejected
    end

    Users->>Vault: claimWinnings(betId)
    Vault-->>Users: Winnings Transferred
```

---

## Database Schema

### Supabase Tables

```mermaid
erDiagram
    USERS {
        uuid id PK
        string wallet_address
        string username
        timestamp created_at
    }

    EVENTS {
        uuid id PK
        string question
        string category
        timestamp deadline
        string status
        string result
        timestamp created_at
    }

    BETS {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        string side
        decimal amount
        string status
        timestamp created_at
    }

    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        string type
        decimal amount
        string tx_hash
        timestamp created_at
    }

    AUDIT_LOG {
        uuid id PK
        string action
        string actor
        json data
        timestamp created_at
    }

    USERS ||--o{ BETS : places
    EVENTS ||--o{ BETS : has
    USERS ||--o{ TRANSACTIONS : makes
```

---

## API Endpoints

### Netlify Functions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | List all events |
| `/api/events/:id` | GET | Get event details |
| `/api/events` | POST | Create new event (admin) |
| `/api/bets` | POST | Place a bet |
| `/api/bets/:id` | GET | Get bet details |
| `/api/user/:address` | GET | Get user info |
| `/api/user/:address/bets` | GET | Get user bets |
| `/api/moonpay/webhook` | POST | MoonPay webhook handler |

---

## Security Architecture

```mermaid
graph TB
    subgraph Security["Security Layers"]
        subgraph SmartContract["Smart Contract Security"]
            SC1[OpenZeppelin Libraries]
            SC2[ReentrancyGuard]
            SC3[Access Control]
            SC4[Pause Mechanism]
        end

        subgraph OffChainSecurity["Off-Chain Security"]
            OC1[Rate Limiting]
            OC2[Input Validation]
            OC3[Authentication]
            OC4[Audit Logging]
        end

        subgraph Infrastructure["Infrastructure Security"]
            INF1[HTTPS/TLS]
            INF2[Environment Variables]
            INF3[Secrets Management]
            INF4[CI/CD Security]
        end
    end

    SmartContract --> OffChainSecurity
    OffChainSecurity --> Infrastructure
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph Development["Development"]
        Local[Local Hardhat]
        Test[Test Suite]
        Lint[Linting]
    end

    subgraph CI["CI/CD Pipeline"]
        Build[Build]
        TestCI[Run Tests]
        Scan[Security Scan]
        Deploy[Deploy]
    end

    subgraph Environments["Environments"]
        Amoy[Polygon Amoy (Testnet)]
        Mainnet[Polygon Mainnet]
    end

    subgraph Monitoring["Monitoring"]
        Events[Event Monitoring]
        Alerts[Alerts]
        Logs[Transaction Logs]
    end

    Development --> CI
    CI --> Amoy
    Amoy --> Mainnet
    Mainnet --> Monitoring
```

---

*Last Updated: 2026-05-21*
