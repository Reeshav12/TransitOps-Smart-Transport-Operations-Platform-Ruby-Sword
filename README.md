# 🚚 TransitOps — Smart Transport Operations Platform

TransitOps is an enterprise-grade, full-stack logistics and transport operations management platform. Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM with SQLite**, it provides a real-time operational dashboard, role-based access control (RBAC), driver safety scoring, vehicle tracking, maintenance scheduling, trip routing, and financial expense analysis.

---

## 🏗️ System Architecture & Data Flow

TransitOps follows a clean, decoupled **Service-Layer Architecture** designed to separate API route orchestration from core business rules and transactional logic.

```mermaid
graph TD
    %% Client Layer
    subgraph Client Layer [Frontend Client]
        UI[React 19 Components / UI]
        Zustand[Zustand Client Store]
        Query[React Query Client Caching]
    end

    %% Routing & Gateway
    subgraph Gateway [Security & Routing Middleware]
        Guard[NextAuth Session Guard]
        RBAC[RBAC Role Validation]
        Limit[In-Memory Sliding Window Rate Limiter]
    end

    %% Service API Controllers
    subgraph Controllers [Next.js API Route Handlers]
        API_Auth[Auth Handler]
        API_Trip[Trip Controller]
        API_Vehicle[Vehicle Controller]
        API_Driver[Driver Controller]
        API_Maint[Maintenance Controller]
        API_Fin[Expenses / Fuel Controller]
    end

    %% Core Services Layer
    subgraph Services [Business Service Layer]
        S_Auth[Auth Service]
        S_Trip[Trip Service]
        S_Vehicle[Vehicle Service]
        S_Driver[Driver Service]
        S_Maint[Maintenance Service]
        S_Fin[Financial / Cost Service]
        Audit[Audit Logs Handler]
    end

    %% Database Layer
    subgraph DB [Data Persistance]
        Prisma[Prisma Client ORM]
        SQLite[(SQLite Database)]
    end

    %% Connections
    UI -->|Request| Guard
    Guard -->|Authenticated| RBAC
    RBAC -->|Allowed| Limit
    Limit -->|Forward| Controllers
    
    API_Auth --> S_Auth
    API_Trip --> S_Trip
    API_Vehicle --> S_Vehicle
    API_Driver --> S_Driver
    API_Maint --> S_Maint
    API_Fin --> S_Fin

    S_Auth -.-> Audit
    S_Trip -.-> Audit
    S_Vehicle -.-> Audit
    S_Driver -.-> Audit
    S_Maint -.-> Audit
    
    S_Auth & S_Trip & S_Vehicle & S_Driver & S_Maint & S_Fin --> Prisma
    Prisma --> SQLite
```

---

## 🗄️ Database & Entity-Relationship (ER) Diagram

The system maintains a highly normalized relational SQLite database via Prisma. Relationships and constraints enforce data consistency (e.g., preventing a driver or vehicle from being assigned to multiple active trips).

```mermaid
erDiagram
    ROLE {
        String id PK
        String name "FLEET_MANAGER | DRIVER | SAFETY_OFFICER | FINANCIAL_ANALYST"
        String description
    }
    USER {
        String id PK
        String email UK
        String name
        String password "Bcrypt Hash"
        String roleId FK
        DateTime createdAt
    }
    VEHICLE {
        String id PK
        String registrationNumber UK
        String model
        String type "TRUCK | VAN | BUS | TRAILER | CAR"
        Float maxLoadCapacity
        Float odometer
        Float acquisitionCost
        String status "Available | OnTrip | InShop | Retired"
        String region
    }
    DRIVER {
        String id PK
        String name
        String licenseNumber UK
        String licenseCategory
        DateTime licenseExpiry
        String contactNumber
        Int safetyScore "0 - 100"
        String status "Available | OnTrip | OffDuty | Suspended"
    }
    TRIP {
        String id PK
        String source
        String destination
        String vehicleId FK
        String driverId FK
        Float cargoWeight
        Float plannedDistance
        Float actualDistance
        Float fuelConsumed
        Float finalOdometer
        String status "Draft | Dispatched | Completed | Cancelled"
        String notes
        DateTime dispatchedAt
        DateTime completedAt
    }
    MAINTENANCE_LOG {
        String id PK
        String vehicleId FK
        String type "OIL_CHANGE | TIRE_ROTATION | ENGINE_REPAIR | etc"
        String description
        Float cost
        String status "Open | Closed"
        DateTime startDate
        DateTime endDate
    }
    FUEL_LOG {
        String id PK
        String vehicleId FK
        Float liters
        Float cost
        Float odometer
        DateTime date
        String tripId FK
    }
    EXPENSE {
        String id PK
        String vehicleId FK
        String type "TOLL | MAINTENANCE | REPAIR | INSURANCE | OTHER"
        Float amount
        String description
        DateTime date
    }
    AUDIT_LOG {
        String id PK
        String userId FK
        String action "CREATE | UPDATE | DELETE | DISPATCH | etc"
        String entity
        String entityId
        String metadata "JSON String"
        DateTime timestamp
    }

    ROLE ||--o{ USER : "has"
    USER ||--o{ AUDIT_LOG : "triggers"
    VEHICLE ||--o{ TRIP : "assigned_to"
    DRIVER ||--o{ TRIP : "assigned_to"
    VEHICLE ||--o{ MAINTENANCE_LOG : "undergoes"
    VEHICLE ||--o{ FUEL_LOG : "consumes"
    VEHICLE ||--o{ EXPENSE : "incurs"
    TRIP ||--o{ FUEL_LOG : "associated_with"
```

---

## 🔄 Trip Lifecycle & State Transitions

Trips transition through strict states using transactional queries (`$transaction`) in Prisma to prevent race conditions (e.g., assigning offline drivers or double-booking vehicles).

```mermaid
stateDiagram-v2
    [*] --> Draft : Create Trip
    Draft --> Dispatched : Dispatch
    Draft --> Cancelled : Cancel
    Dispatched --> Completed : Complete
    Dispatched --> Cancelled : Cancel
    Completed --> [*]
    Cancelled --> [*]
```

### Transition Operations & Business Logic

*   **Dispatch Action (`Draft` ➔ `Dispatched`)**:
    1. Validates that both the assigned Driver and Vehicle are currently `Available`.
    2. Updates the Driver's status to `OnTrip`.
    3. Updates the Vehicle's status to `OnTrip`.
*   **Complete Action (`Dispatched` ➔ `Completed`)**:
    1. Records actual distance traveled and fuel consumed.
    2. Updates the Vehicle's odometer reading.
    3. Automatically creates a `FuelLog` transaction (calculated at estimated cost).
    4. Resets both the Driver and Vehicle status back to `Available`.
*   **Cancel Action (`Draft` / `Dispatched` ➔ `Cancelled`)**:
    1. Resets both the Driver and Vehicle status back to `Available`.

---

## 🚀 Key Modules & Capabilities

- **📊 Operations Dashboard**: Visualizes real-time fleet KPIs (distance, fuel costs, active trips) alongside active status counters and a real-time Audit Log feed.
- **🚚 Fleet & Vehicle Inventory**: Tracks model details, odometer readings, and status transitions (`Available`, `OnTrip`, `InShop`, `Retired`).
- **👥 Operator Registry & Compliance**: Tracks licensing categories, active schedules, and real-time safety scores calculated from trip performance.
- **🔧 Maintenance logs & Workshops**: Tracks scheduled/emergency shop work (e.g., oil change, brake service, engine repair) and updates vehicle inventory statuses.
- **⛽ Fuel & Expense Tracking**: Logs refilling receipts and operations overhead costs (tolls, insurance, repairs).
- **🔒 Role-Based Access Control (RBAC)**: Protects views and actions strictly based on permissions:

| Module / Action | Fleet Manager | Driver | Safety Officer | Financial Analyst |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Vehicles** | Write / Edit | Read Only | Read Only | Read Only |
| **Manage Drivers** | Write / Edit | Read Only | Write / Edit | Read Only |
| **Dispatch / End Trips** | Write / Edit | Write / Edit | No Access | No Access |
| **Close Maintenance** | Write / Edit | No Access | No Access | No Access |
| **Expenses & Fuel** | Write / Edit | No Access | No Access | Write / Edit |
| **View Audit Logs** | Read Only | No Access | Read Only | No Access |

---

## ⚙️ Getting Started & Setup Guide

### 1. Installation
Install the required package dependencies:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="TransitOpsSecretKey2026ForHackathonDevelopmentOnly"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Initialization
Generate the Prisma client files and synchronize the relational schema mapping with the SQLite database:
```bash
npx prisma generate
npx prisma db push
```

### 4. Database Seeding
Populate the database with roles, users, and mock logistics records:
```bash
npm run db:seed
```

### 5. Start Development Server
Run the local next development environment:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Login Credentials
You can log in and test different user contexts using the following credentials:
* **Common Password for All Users:** `TransitOps@123`

| User Role | Assigned User | Login Email |
| :--- | :--- | :--- |
| **Fleet Manager** | Anurag Singh | `fleet@transitops.com` |
| **Driver** | Reeshav Raj | `driver@transitops.com` |
| **Safety Officer** | Rituraj Sharma | `safety@transitops.com` |
| **Financial Analyst** | Yashraj Kumar | `finance@transitops.com` |

---

## ❓ FAQ (Frequently Asked Questions)

#### Q: How is the rate limiter configured?
The rate limiter (`src/lib/rate-limit.ts`) uses an in-memory sliding window store. It allows up to 5 login attempts per minute for auth routes, and 30 mutations per minute for database endpoints to prevent API abuse.

#### Q: Why am I getting "Error code 14: Unable to open the database file"?
This error occurs if the database directory is missing or your `DATABASE_URL` is pointing to an invalid absolute directory path. Ensure your `.env` contains `DATABASE_URL="file:./dev.db"` which resolves relative to the `prisma/` folder structure.

#### Q: How do I reset the mock database data?
You can reset the database and seed it again fresh by running:
```bash
rm prisma/dev.db
npx prisma db push
npm run db:seed
```

---

## 👥 Credits & Development Team
* **Frontend Design & Engineering:** [Reeshav Raj](https://github.com/Reeshav12)
* **Backend Architecture & Core Services:** [Anurag Singh](https://github.com/Anurag-M1)
