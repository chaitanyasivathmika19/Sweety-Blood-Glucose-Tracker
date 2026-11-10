# Sweety PostgreSQL Database Schema & Relationships

## Entity-Relationship Overview

```
                      +------------------+
                      |      users       |
                      +--------+---------+
                               |
         +---------------------+---------------------+
         | 1:1                 | 1:1                 | 1:N
         v                     v                     v
+-----------------+   +-----------------+   +------------------+
| patient_profiles|   | doctor_profiles |   | glucose_readings |
+-----------------+   +-----------------+   +------------------+
                               |                      |
                               | 1:N                  |
                               v                      |
                      +-----------------+             |
                      |  subscriptions  |<------------+
                      +--------+--------+ (Authorized access check)
                               |
             +-----------------+-----------------+
             | 1:1                               | 1:N
             v                                   v
+--------------------+               +-----------------------+
|payment_submissions |               |   messages / followup |
+--------------------+               +-----------------------+
```

## Schema Entities

### `users`
- `id` SERIAL PRIMARY KEY
- `name` VARCHAR(255) NOT NULL
- `email` VARCHAR(255) UNIQUE NOT NULL
- `password_hash` VARCHAR(255) NOT NULL
- `role` VARCHAR(50) DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin'))
- `created_at` TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

### `glucose_readings`
- `id` SERIAL PRIMARY KEY
- `patient_id` INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `reading_date` DATE NOT NULL
- `time_slot` VARCHAR(50) NOT NULL CHECK (time_slot IN ('morning', 'breakfast', 'lunch', 'dinner'))
- `glucose_value` INTEGER NOT NULL CHECK (glucose_value >= 40 AND glucose_value <= 600)
- `created_at` TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
- **Constraints**: `UNIQUE (patient_id, reading_date, time_slot)`

### `consultation_plans`
- `id` SERIAL PRIMARY KEY
- `name` VARCHAR(100) NOT NULL
- `price` INTEGER NOT NULL (250, 400, 600)
- `frequency_days` INTEGER NOT NULL (30, 15, 7)
- `validity_months` INTEGER DEFAULT 2
- `description` TEXT

### `subscriptions`
- `id` SERIAL PRIMARY KEY
- `patient_id` INTEGER REFERENCES users(id)
- `doctor_id` INTEGER REFERENCES users(id)
- `plan_id` INTEGER REFERENCES consultation_plans(id)
- `fee` INTEGER NOT NULL
- `status` VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled'))
- `activation_date` TIMESTAMPTZ
- `expiry_date` TIMESTAMPTZ (computed as `activation_date + 2 calendar months`)

### `payment_submissions`
- `id` SERIAL PRIMARY KEY
- `subscription_id` INTEGER REFERENCES subscriptions(id)
- `patient_id` INTEGER REFERENCES users(id)
- `doctor_id` INTEGER REFERENCES users(id)
- `transaction_ref` VARCHAR(255) UNIQUE NOT NULL
- `status` VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
- `rejection_reason` TEXT
- `reviewed_by` INTEGER REFERENCES users(id)
- `reviewed_at` TIMESTAMPTZ

### `messages` & `followup_requests`
- Encrypted conversation logs, participant membership verification, access expiration date enforcement.

### `notifications`
- In-app notification records with `user_id`, `category`, `is_read`, `created_at`.
