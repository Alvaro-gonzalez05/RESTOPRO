# Database Context for Chatbot Development

This file contains the essential database information needed for chatbot implementation.

## Key Tables for Chatbot (16 found)

### users
**Purpose**: [Table for users]
**Rows**: N/A

**Key Columns**:
- `instance_id` (uuid) - Optional
- `id` (uuid) - Required
- `aud` (character varying) - Optional
- `role` (character varying) - Optional
- `email` (character varying) - Optional
- `encrypted_password` (character varying) - Optional
- `email_confirmed_at` (timestamp with time zone) - Optional
- `invited_at` (timestamp with time zone) - Optional
- `confirmation_token` (character varying) - Optional
- `confirmation_sent_at` (timestamp with time zone) - Optional
- `recovery_token` (character varying) - Optional
- `recovery_sent_at` (timestamp with time zone) - Optional
- `email_change_token_new` (character varying) - Optional
- `email_change` (character varying) - Optional
- `email_change_sent_at` (timestamp with time zone) - Optional
- `last_sign_in_at` (timestamp with time zone) - Optional
- `raw_app_meta_data` (jsonb) - Optional
- `raw_user_meta_data` (jsonb) - Optional
- `is_super_admin` (boolean) - Optional
- `created_at` (timestamp with time zone) - Optional
- `updated_at` (timestamp with time zone) - Optional
- `phone` (text) - Optional
- `phone_confirmed_at` (timestamp with time zone) - Optional
- `phone_change` (text) - Optional
- `phone_change_token` (character varying) - Optional
- `phone_change_sent_at` (timestamp with time zone) - Optional
- `confirmed_at` (timestamp with time zone) - Optional
- `email_change_token_current` (character varying) - Optional
- `email_change_confirm_status` (smallint) - Optional
- `banned_until` (timestamp with time zone) - Optional
- `reauthentication_token` (character varying) - Optional
- `reauthentication_sent_at` (timestamp with time zone) - Optional
- `is_sso_user` (boolean) - Required
- `deleted_at` (timestamp with time zone) - Optional
- `is_anonymous` (boolean) - Required

### bot_conversations
**Purpose**: [Table for bot conversations]
**Rows**: N/A

**Key Columns**:
- `id` (integer) - Required
- `user_bot_id` (integer) - Required
- `contact_number` (text) - Required
- `contact_name` (text) - Optional
- `last_message` (text) - Optional
- `last_message_at` (timestamp without time zone) - Optional
- `conversation_data` (jsonb) - Optional
- `created_at` (timestamp without time zone) - Optional

### bot_messages
**Purpose**: [Table for bot messages]
**Rows**: N/A

**Key Columns**:
- `id` (integer) - Required
- `conversation_id` (integer) - Required
- `message_type` (text) - Required
- `content` (text) - Required
- `message_data` (jsonb) - Optional
- `created_at` (timestamp without time zone) - Optional

### business_info
**Purpose**: [Table for business info]
**Rows**: 1

**Key Columns**:
- `id` (integer) - Required
- `user_id` (integer) - Required
- `business_name` (character varying) - Optional
- `description` (text) - Optional
- `address` (text) - Optional
- `phone` (character varying) - Optional
- `email` (character varying) - Optional
- `website` (character varying) - Optional
- `business_hours` (jsonb) - Optional
- `social_media` (jsonb) - Optional
- `auto_responses` (boolean) - Optional
- `created_at` (timestamp without time zone) - Optional
- `updated_at` (timestamp without time zone) - Optional
- `menu_link` (text) - Optional
- `business_type` (text) - Optional
- `location_link` (text) - Optional
- `delivery_info` (text) - Optional

### chatbot_interactions
**Purpose**: [Table for chatbot interactions]
**Rows**: 33

**Key Columns**:
- `id` (integer) - Required
- `user_id` (integer) - Required
- `customer_phone` (character varying) - Required
- `incoming_message` (text) - Required
- `bot_response` (text) - Required
- `created_at` (timestamp without time zone) - Optional

### chatbot_messages
**Purpose**: [Table for chatbot messages]
**Rows**: N/A

**Key Columns**:
- `id` (integer) - Required
- `user_id` (integer) - Required
- `category` (character varying) - Required
- `trigger_keywords` (ARRAY) - Required
- `message_text` (text) - Required
- `is_active` (boolean) - Optional
- `created_at` (timestamp without time zone) - Optional
- `updated_at` (timestamp without time zone) - Optional
- `has_options` (boolean) - Optional
- `options` (jsonb) - Optional

### customers
**Purpose**: [Table for customers]
**Rows**: 3

**Key Columns**:
- `id` (integer) - Required
- `user_id` (integer) - Required
- `name` (character varying) - Required
- `email` (character varying) - Optional
- `phone` (character varying) - Optional
- `address` (text) - Optional
- `created_at` (timestamp without time zone) - Optional
- `points` (integer) - Optional

### order_items
**Purpose**: [Table for order items]
**Rows**: 17

**Key Columns**:
- `id` (integer) - Required
- `order_id` (integer) - Required
- `product_id` (integer) - Required
- `product_name` (character varying) - Required
- `quantity` (integer) - Required
- `unit_price` (numeric) - Required
- `total_price` (numeric) - Required
- `category_id` (integer) - Optional
- `redeemed` (boolean) - Optional
- `redeemed_quantity` (integer) - Optional

### order_summary
**Purpose**: [Table for order summary]
**Rows**: 14

**Key Columns**:
- `id` (integer) - Optional
- `user_id` (integer) - Optional
- `customer_name` (character varying) - Optional
- `total` (numeric) - Optional
- `status` (character varying) - Optional
- `created_at` (timestamp without time zone) - Optional
- `item_count` (bigint) - Optional
- `total_items` (bigint) - Optional

### orders
**Purpose**: [Table for orders]
**Rows**: 14

**Key Columns**:
- `id` (integer) - Required
- `user_id` (integer) - Required
- `customer_id` (integer) - Optional
- `customer_name` (character varying) - Required
- `total` (numeric) - Required
- `status` (character varying) - Optional
- `notes` (text) - Optional
- `created_at` (timestamp without time zone) - Optional
- `updated_at` (timestamp without time zone) - Optional
- `table_number` (character varying) - Optional
- `payment_method_id` (integer) - Optional
- `payment_method_name` (character varying) - Optional

### products
**Purpose**: [Table for products]
**Rows**: 4

**Key Columns**:
- `id` (integer) - Required
- `user_id` (integer) - Required
- `category_id` (integer) - Optional
- `name` (character varying) - Required
- `description` (text) - Optional
- `price` (numeric) - Required
- `image_url` (character varying) - Optional
- `is_available` (boolean) - Optional
- `created_at` (timestamp without time zone) - Optional

### user_bots
**Purpose**: [Table for user bots]
**Rows**: 1

**Key Columns**:
- `id` (integer) - Required
- `user_id` (integer) - Required
- `bot_name` (text) - Required
- `phone_number` (text) - Optional
- `qr_code` (text) - Optional
- `status` (text) - Optional
- `session_data` (jsonb) - Optional
- `ai_enabled` (boolean) - Optional
- `ai_role` (text) - Optional
- `ai_instructions` (text) - Optional
- `openai_api_key` (text) - Optional
- `created_at` (timestamp without time zone) - Optional
- `updated_at` (timestamp without time zone) - Optional
- `name` (character varying) - Optional
- `is_active` (boolean) - Optional
- `default_response` (text) - Optional

### users
**Purpose**: [Table for users]
**Rows**: 4

**Key Columns**:
- `id` (integer) - Required
- `email` (character varying) - Required
- `password_hash` (character varying) - Required
- `restaurant_name` (character varying) - Required
- `created_at` (timestamp without time zone) - Optional
- `full_name` (character varying) - Required
- `phone` (character varying) - Required

### whatsapp_conversations
**Purpose**: [Table for whatsapp conversations]
**Rows**: 4

**Key Columns**:
- `id` (integer) - Required
- `user_id` (integer) - Required
- `customer_phone` (text) - Required
- `last_message` (text) - Optional
- `last_message_timestamp` (timestamp with time zone) - Optional
- `context` (jsonb) - Optional
- `created_at` (timestamp with time zone) - Optional
- `updated_at` (timestamp with time zone) - Optional

### whatsapp_messages
**Purpose**: [Table for whatsapp messages]
**Rows**: 95

**Key Columns**:
- `id` (integer) - Required
- `conversation_id` (integer) - Required
- `user_id` (integer) - Required
- `message_type` (character varying) - Required
- `message_text` (text) - Required
- `is_from_bot` (boolean) - Optional
- `ai_response_used` (boolean) - Optional
- `timestamp` (timestamp with time zone) - Optional

### messages
**Purpose**: [Table for messages]
**Rows**: N/A

**Key Columns**:
- `topic` (text) - Required
- `extension` (text) - Required
- `payload` (jsonb) - Optional
- `event` (text) - Optional
- `private` (boolean) - Optional
- `updated_at` (timestamp without time zone) - Required
- `inserted_at` (timestamp without time zone) - Required
- `id` (uuid) - Required

## Important Relationships

- bot_conversations.user_bot_id → user_bots.id
- bot_messages.conversation_id → bot_conversations.id
- chatbot_messages.user_id → users.id
- rewards.user_id → users.id
- user_bots.user_id → users.id
- whatsapp_messages.conversation_id → whatsapp_conversations.id

## Recommendations for Chatbot

Based on the database structure, consider implementing:

1. **Menu/Product Queries**: Use product/menu tables for showing available items
2. **Order Processing**: Integrate with existing order tables
3. **Customer Management**: Link conversations to customer records
4. **Missing Tables**: Consider adding reservations table if not present
5. **Bot Configuration**: Store bot settings per business/restaurant
