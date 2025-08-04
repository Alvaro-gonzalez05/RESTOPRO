# Database Structure Report

Generated on: 2025-08-04T01:57:59.206Z

## Summary

- **Total Tables**: 50
- **Total Relationships**: 7

## Tables Overview

### audit_log_entries
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 5

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| instance_id | uuid | YES | NULL |
| id | uuid | NO | NULL |
| payload | json | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |
| ip_address | character varying(64) | NO | ''::character varying |

### flow_state
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 12

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | NULL |
| user_id | uuid | YES | NULL |
| auth_code | text | NO | NULL |
| code_challenge_method | USER-DEFINED | NO | NULL |
| code_challenge | text | NO | NULL |
| provider_type | text | NO | NULL |
| provider_access_token | text | YES | NULL |
| provider_refresh_token | text | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |
| updated_at | timestamp with time zone | YES | NULL |
| authentication_method | text | NO | NULL |
| auth_code_issued_at | timestamp with time zone | YES | NULL |

### identities
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 9

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| provider_id | text | NO | NULL |
| user_id | uuid | NO | NULL |
| identity_data | jsonb | NO | NULL |
| provider | text | NO | NULL |
| last_sign_in_at | timestamp with time zone | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |
| updated_at | timestamp with time zone | YES | NULL |
| email | text | YES | NULL |
| id | uuid | NO | gen_random_uuid() |

### instances
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 5

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | NULL |
| uuid | uuid | YES | NULL |
| raw_base_config | text | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |
| updated_at | timestamp with time zone | YES | NULL |

### mfa_amr_claims
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 5

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| session_id | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | NULL |
| updated_at | timestamp with time zone | NO | NULL |
| authentication_method | text | NO | NULL |
| id | uuid | NO | NULL |

### mfa_challenges
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 7

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | NULL |
| factor_id | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | NULL |
| verified_at | timestamp with time zone | YES | NULL |
| ip_address | inet | NO | NULL |
| otp_code | text | YES | NULL |
| web_authn_session_data | jsonb | YES | NULL |

### mfa_factors
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 12

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | NULL |
| user_id | uuid | NO | NULL |
| friendly_name | text | YES | NULL |
| factor_type | USER-DEFINED | NO | NULL |
| status | USER-DEFINED | NO | NULL |
| created_at | timestamp with time zone | NO | NULL |
| updated_at | timestamp with time zone | NO | NULL |
| secret | text | YES | NULL |
| phone | text | YES | NULL |
| last_challenged_at | timestamp with time zone | YES | NULL |
| web_authn_credential | jsonb | YES | NULL |
| web_authn_aaguid | uuid | YES | NULL |

### one_time_tokens
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 7

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | NULL |
| user_id | uuid | NO | NULL |
| token_type | USER-DEFINED | NO | NULL |
| token_hash | text | NO | NULL |
| relates_to | text | NO | NULL |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |

### refresh_tokens
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 9

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| instance_id | uuid | YES | NULL |
| id | bigint | NO | nextval('auth.refresh_tokens_id_seq'::regclass) |
| token | character varying(255) | YES | NULL |
| user_id | character varying(255) | YES | NULL |
| revoked | boolean | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |
| updated_at | timestamp with time zone | YES | NULL |
| parent | character varying(255) | YES | NULL |
| session_id | uuid | YES | NULL |

### saml_providers
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 9

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | NULL |
| sso_provider_id | uuid | NO | NULL |
| entity_id | text | NO | NULL |
| metadata_xml | text | NO | NULL |
| metadata_url | text | YES | NULL |
| attribute_mapping | jsonb | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |
| updated_at | timestamp with time zone | YES | NULL |
| name_id_format | text | YES | NULL |

### saml_relay_states
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 8

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | NULL |
| sso_provider_id | uuid | NO | NULL |
| request_id | text | NO | NULL |
| for_email | text | YES | NULL |
| redirect_to | text | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |
| updated_at | timestamp with time zone | YES | NULL |
| flow_state_id | uuid | YES | NULL |

### schema_migrations
- **Schema**: auth
- **Rows**: 61
- **Columns**: 1

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| version | character varying(255) | NO | NULL |

#### Sample Data (First 5 rows)
| version |
| --- |
| 20171026211738 |
| 20171026211808 |
| 20171026211834 |
| 20180103212743 |
| 20180108183307 |

### sessions
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 11

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | NULL |
| user_id | uuid | NO | NULL |
| created_at | timestamp with time zone | YES | NULL |
| updated_at | timestamp with time zone | YES | NULL |
| factor_id | uuid | YES | NULL |
| aal | USER-DEFINED | YES | NULL |
| not_after | timestamp with time zone | YES | NULL |
| refreshed_at | timestamp without time zone | YES | NULL |
| user_agent | text | YES | NULL |
| ip | inet | YES | NULL |
| tag | text | YES | NULL |

### sso_domains
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 5

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | NULL |
| sso_provider_id | uuid | NO | NULL |
| domain | text | NO | NULL |
| created_at | timestamp with time zone | YES | NULL |
| updated_at | timestamp with time zone | YES | NULL |

### sso_providers
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 4

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | NULL |
| resource_id | text | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |
| updated_at | timestamp with time zone | YES | NULL |

### users
- **Schema**: auth
- **Rows**: N/A
- **Columns**: 35

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| instance_id | uuid | YES | NULL |
| id | uuid | NO | NULL |
| aud | character varying(255) | YES | NULL |
| role | character varying(255) | YES | NULL |
| email | character varying(255) | YES | NULL |
| encrypted_password | character varying(255) | YES | NULL |
| email_confirmed_at | timestamp with time zone | YES | NULL |
| invited_at | timestamp with time zone | YES | NULL |
| confirmation_token | character varying(255) | YES | NULL |
| confirmation_sent_at | timestamp with time zone | YES | NULL |
| recovery_token | character varying(255) | YES | NULL |
| recovery_sent_at | timestamp with time zone | YES | NULL |
| email_change_token_new | character varying(255) | YES | NULL |
| email_change | character varying(255) | YES | NULL |
| email_change_sent_at | timestamp with time zone | YES | NULL |
| last_sign_in_at | timestamp with time zone | YES | NULL |
| raw_app_meta_data | jsonb | YES | NULL |
| raw_user_meta_data | jsonb | YES | NULL |
| is_super_admin | boolean | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |
| updated_at | timestamp with time zone | YES | NULL |
| phone | text | YES | NULL::character varying |
| phone_confirmed_at | timestamp with time zone | YES | NULL |
| phone_change | text | YES | ''::character varying |
| phone_change_token | character varying(255) | YES | ''::character varying |
| phone_change_sent_at | timestamp with time zone | YES | NULL |
| confirmed_at | timestamp with time zone | YES | NULL |
| email_change_token_current | character varying(255) | YES | ''::character varying |
| email_change_confirm_status | smallint | YES | 0 |
| banned_until | timestamp with time zone | YES | NULL |
| reauthentication_token | character varying(255) | YES | ''::character varying |
| reauthentication_sent_at | timestamp with time zone | YES | NULL |
| is_sso_user | boolean | NO | false |
| deleted_at | timestamp with time zone | YES | NULL |
| is_anonymous | boolean | NO | false |

### automation_executions
- **Schema**: public
- **Rows**: N/A
- **Columns**: 7

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('automation_executions_id_seq'::regclass) |
| rule_id | integer | NO | NULL |
| customer_id | integer | YES | NULL |
| customer_phone | character varying(20) | YES | NULL |
| execution_status | character varying(50) | YES | NULL |
| execution_details | jsonb | YES | NULL |
| executed_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### automation_rules
- **Schema**: public
- **Rows**: N/A
- **Columns**: 11

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('automation_rules_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| name | character varying(255) | NO | NULL |
| trigger_type | character varying(100) | YES | NULL |
| trigger_conditions | jsonb | YES | NULL |
| action_type | character varying(100) | YES | NULL |
| action_data | jsonb | YES | NULL |
| is_active | boolean | YES | true |
| last_executed | timestamp without time zone | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### bot_conversations
- **Schema**: public
- **Rows**: N/A
- **Columns**: 8

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('bot_conversations_id_seq'::regclass) |
| user_bot_id | integer | NO | NULL |
| contact_number | text | NO | NULL |
| contact_name | text | YES | NULL |
| last_message | text | YES | NULL |
| last_message_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| conversation_data | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### bot_messages
- **Schema**: public
- **Rows**: N/A
- **Columns**: 6

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('bot_messages_id_seq'::regclass) |
| conversation_id | integer | NO | NULL |
| message_type | text | NO | NULL |
| content | text | NO | NULL |
| message_data | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### business_info
- **Schema**: public
- **Rows**: 1
- **Columns**: 17

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('business_info_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| business_name | character varying(255) | YES | NULL |
| description | text | YES | NULL |
| address | text | YES | NULL |
| phone | character varying(50) | YES | NULL |
| email | character varying(255) | YES | NULL |
| website | character varying(255) | YES | NULL |
| business_hours | jsonb | YES | NULL |
| social_media | jsonb | YES | NULL |
| auto_responses | boolean | YES | true |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| menu_link | text | YES | ''::text |
| business_type | text | YES | NULL |
| location_link | text | YES | NULL |
| delivery_info | text | YES | NULL |

#### Sample Data (First 5 rows)
| id | user_id | business_name | description | address | phone | email | website | business_hours | social_media | auto_responses | created_at | updated_at | menu_link | business_type | location_link | delivery_info |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | El sitio- Restobar | Somos un Negoicio familiar que esta ubicado en ... | Loria Oeste 165, Godoy cruz | 2616977056 | alvarogonzalez408@gmail.com | http://localhost:3000/dashboard/chatbot/config | {"lunes":{"from":"16:00","to":"00:00","closed":... | {"twitter":"","facebook":"","whatsapp":"","inst... | true | Wed Jul 23 2025 16:29:47 GMT-0300 (hora estándar de Argentina) | Sun Jul 27 2025 21:26:10 GMT-0300 (hora estándar de Argentina) | https://drive.google.com/file/d/141NP2cAKh8srhH... | Restaurante y Cafeteria | https://www.google.com/maps/place/STAFF+Caterin... | HOLA SOLO HAY PEDIDOS YA y al siguiente link ht... |

### categories
- **Schema**: public
- **Rows**: 3
- **Columns**: 4

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('categories_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| name | character varying(255) | NO | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Sample Data (First 5 rows)
| id | user_id | name | created_at |
| --- | --- | --- | --- |
| 1 | 2 | Lomos | Fri Jul 04 2025 03:43:36 GMT-0300 (hora estándar de Argentina) |
| 2 | 2 | milas | Fri Jul 04 2025 03:43:52 GMT-0300 (hora estándar de Argentina) |
| 3 | 2 | pizzas | Sun Jul 06 2025 17:16:31 GMT-0300 (hora estándar de Argentina) |

### chatbot_interactions
- **Schema**: public
- **Rows**: 33
- **Columns**: 6

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('chatbot_interactions_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| customer_phone | character varying(50) | NO | NULL |
| incoming_message | text | NO | NULL |
| bot_response | text | NO | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Sample Data (First 5 rows)
| id | user_id | customer_phone | incoming_message | bot_response | created_at |
| --- | --- | --- | --- | --- | --- |
| 25 | 2 | test-chat-widget | hola 
 horarios | ¡Hola! 👋 Bienvenido/a a nuestro servicio. ¿En ... | Fri Aug 01 2025 18:36:32 GMT-0300 (hora estándar de Argentina) |
| 26 | 2 | test-chat-widget | queria saber los horarios | 📅 *HORARIOS DE ATENCIÓN:*



¿En qué más puedo... | Fri Aug 01 2025 18:36:48 GMT-0300 (hora estándar de Argentina) |
| 27 | 2 | test-chat-widget | hola 
 horarios | ¡Hola! 👋 Bienvenido/a a nuestro servicio. ¿En ... | Fri Aug 01 2025 18:43:26 GMT-0300 (hora estándar de Argentina) |
| 28 | 2 | test-chat-widget | hola 
 horarios= 
 ¿ | ¡Hola! 👋 Bienvenido/a a nuestro servicio. ¿En ... | Fri Aug 01 2025 18:44:04 GMT-0300 (hora estándar de Argentina) |
| 29 | 2 | test-chat-widget | horarios? | 📅 *HORARIOS DE ATENCIÓN:*



¿En qué más puedo... | Fri Aug 01 2025 18:44:22 GMT-0300 (hora estándar de Argentina) |

### chatbot_messages
- **Schema**: public
- **Rows**: N/A
- **Columns**: 10

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('chatbot_messages_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| category | character varying(100) | NO | NULL |
| trigger_keywords | ARRAY | NO | NULL |
| message_text | text | NO | NULL |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| has_options | boolean | YES | false |
| options | jsonb | YES | '[]'::jsonb |

### customers
- **Schema**: public
- **Rows**: 3
- **Columns**: 8

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('customers_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| name | character varying(255) | NO | NULL |
| email | character varying(255) | YES | NULL |
| phone | character varying(50) | YES | NULL |
| address | text | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| points | integer | YES | 0 |

#### Sample Data (First 5 rows)
| id | user_id | name | email | phone | address | created_at | points |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4 | 2 | juann | NULL | 2616977056 | NULL | Mon Jul 14 2025 18:46:43 GMT-0300 (hora estándar de Argentina) | 0 |
| 2 | 2 | juan | juanpoerez@gmail.com | 2616977056 | loriaeste | Fri Jul 11 2025 18:23:22 GMT-0300 (hora estándar de Argentina) | 60 |
| 1 | 2 | Alvaro | GONZALEZVICARIO@GMAIL.COM | 2616977056 | LORIA 15 | Fri Jul 11 2025 16:53:41 GMT-0300 (hora estándar de Argentina) | 130 |

### daily_sales
- **Schema**: public
- **Rows**: 3
- **Columns**: 5

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| user_id | integer | YES | NULL |
| sale_date | date | YES | NULL |
| order_count | bigint | YES | NULL |
| total_sales | numeric | YES | NULL |
| average_order_value | numeric | YES | NULL |

#### Sample Data (First 5 rows)
| user_id | sale_date | order_count | total_sales | average_order_value |
| --- | --- | --- | --- | --- |
| 2 | Thu Jul 17 2025 00:00:00 GMT-0300 (hora estándar de Argentina) | 3 | 127000.00 | 42333.333333333333 |
| 2 | Wed Jul 16 2025 00:00:00 GMT-0300 (hora estándar de Argentina) | 5 | 157000.00 | 31400.000000000000 |
| 2 | Tue Jul 15 2025 00:00:00 GMT-0300 (hora estándar de Argentina) | 6 | 719000.00 | 119833.333333333333 |

### expenses
- **Schema**: public
- **Rows**: 3
- **Columns**: 13

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('expenses_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| supplier_id | integer | YES | NULL |
| supplier_name | character varying(255) | NO | NULL |
| description | text | NO | NULL |
| amount | numeric | NO | NULL |
| category | character varying(100) | YES | NULL |
| expense_date | date | NO | NULL |
| payment_method | character varying(50) | YES | NULL |
| receipt_number | character varying(100) | YES | NULL |
| notes | text | YES | NULL |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

#### Sample Data (First 5 rows)
| id | user_id | supplier_id | supplier_name | description | amount | category | expense_date | payment_method | receipt_number | notes | created_at | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 1 | Cafe5Hispanos | compra de cafe | 10000.00 | ingredientes | Fri Jul 18 2025 00:00:00 GMT-0300 (hora estándar de Argentina) | efectivo | 55555 | NULL | Fri Jul 18 2025 04:23:01 GMT-0300 (hora estándar de Argentina) | Fri Jul 18 2025 04:23:01 GMT-0300 (hora estándar de Argentina) |
| 2 | 2 | 1 | Cafe5Hispanos | cafe | 5000.00 | ingredientes | Mon Jul 21 2025 00:00:00 GMT-0300 (hora estándar de Argentina) | efectivo | NULL | NULL | Mon Jul 21 2025 16:37:17 GMT-0300 (hora estándar de Argentina) | Mon Jul 21 2025 16:38:23 GMT-0300 (hora estándar de Argentina) |
| 3 | 2 | 2 | Empanadas lucas | EMPANADAS | 6000.00 | servicios | Mon Jul 21 2025 00:00:00 GMT-0300 (hora estándar de Argentina) | efectivo | NULL | NULL | Mon Jul 21 2025 16:41:48 GMT-0300 (hora estándar de Argentina) | Mon Jul 21 2025 16:42:23 GMT-0300 (hora estándar de Argentina) |

### order_items
- **Schema**: public
- **Rows**: 17
- **Columns**: 10

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('order_items_id_seq'::regclass) |
| order_id | integer | NO | NULL |
| product_id | integer | NO | NULL |
| product_name | character varying(255) | NO | NULL |
| quantity | integer | NO | NULL |
| unit_price | numeric | NO | NULL |
| total_price | numeric | NO | NULL |
| category_id | integer | YES | NULL |
| redeemed | boolean | YES | false |
| redeemed_quantity | integer | YES | 0 |

#### Sample Data (First 5 rows)
| id | order_id | product_id | product_name | quantity | unit_price | total_price | category_id | redeemed | redeemed_quantity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 36 | 21 | 3 | Lomo De Entraña | 2 | 30000.00 | 60000.00 | 1 | false | 0 |
| 37 | 22 | 3 | Lomo De Entraña | 4 | 30000.00 | 120000.00 | 1 | false | 0 |
| 38 | 22 | 2 | Mila De la puta madre | 1 | 40000.00 | 40000.00 | 2 | false | 0 |
| 39 | 23 | 1 | Lomo Completo | 1 | 23000.00 | 23000.00 | 1 | false | 0 |
| 40 | 24 | 4 | Lomo De Carne Mechada | 8 | 37000.00 | 296000.00 | 1 | false | 0 |

### order_summary
- **Schema**: public
- **Rows**: 14
- **Columns**: 8

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | YES | NULL |
| user_id | integer | YES | NULL |
| customer_name | character varying(255) | YES | NULL |
| total | numeric | YES | NULL |
| status | character varying(50) | YES | NULL |
| created_at | timestamp without time zone | YES | NULL |
| item_count | bigint | YES | NULL |
| total_items | bigint | YES | NULL |

#### Sample Data (First 5 rows)
| id | user_id | customer_name | total | status | created_at | item_count | total_items |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 30 | 2 | juan | 30000.00 | completado | Wed Jul 16 2025 03:54:32 GMT-0300 (hora estándar de Argentina) | 1 | 1 |
| 34 | 2 | juan | 67000.00 | pendiente | Thu Jul 17 2025 04:01:29 GMT-0300 (hora estándar de Argentina) | 2 | 2 |
| 21 | 2 | Alvaro | 60000.00 | completado | Tue Jul 15 2025 19:04:27 GMT-0300 (hora estándar de Argentina) | 1 | 2 |
| 26 | 2 | Alvaro | 150000.00 | completado | Tue Jul 15 2025 20:17:16 GMT-0300 (hora estándar de Argentina) | 2 | 4 |
| 27 | 2 | juan | 30000.00 | completado | Wed Jul 16 2025 02:47:59 GMT-0300 (hora estándar de Argentina) | 1 | 1 |

### orders
- **Schema**: public
- **Rows**: 14
- **Columns**: 12

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('orders_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| customer_id | integer | YES | NULL |
| customer_name | character varying(255) | NO | NULL |
| total | numeric | NO | NULL |
| status | character varying(50) | YES | 'pendiente'::character varying |
| notes | text | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| table_number | character varying(50) | YES | NULL |
| payment_method_id | integer | YES | NULL |
| payment_method_name | character varying(100) | YES | NULL |

#### Sample Data (First 5 rows)
| id | user_id | customer_id | customer_name | total | status | notes | created_at | updated_at | table_number | payment_method_id | payment_method_name |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 22 | 2 | 2 | juan | 160000.00 | completado | NULL | Tue Jul 15 2025 19:04:41 GMT-0300 (hora estándar de Argentina) | Tue Jul 15 2025 19:05:09 GMT-0300 (hora estándar de Argentina) | a | NULL | NULL |
| 21 | 2 | 1 | Alvaro | 60000.00 | completado | NULL | Tue Jul 15 2025 19:04:27 GMT-0300 (hora estándar de Argentina) | Tue Jul 15 2025 19:05:14 GMT-0300 (hora estándar de Argentina) | vip | NULL | NULL |
| 23 | 2 | 2 | juan | 23000.00 | completado | NULL | Tue Jul 15 2025 19:22:14 GMT-0300 (hora estándar de Argentina) | Tue Jul 15 2025 19:22:44 GMT-0300 (hora estándar de Argentina) | vip | NULL | NULL |
| 24 | 2 | 1 | Alvaro | 296000.00 | completado | NULL | Tue Jul 15 2025 19:22:28 GMT-0300 (hora estándar de Argentina) | Tue Jul 15 2025 19:22:49 GMT-0300 (hora estándar de Argentina) | a | NULL | NULL |
| 25 | 2 | 1 | Alvaro | 30000.00 | completado | NULL | Tue Jul 15 2025 20:04:32 GMT-0300 (hora estándar de Argentina) | Tue Jul 15 2025 20:04:46 GMT-0300 (hora estándar de Argentina) | vip | NULL | NULL |

### payment_methods
- **Schema**: public
- **Rows**: 10
- **Columns**: 5

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('payment_methods_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| name | character varying(100) | NO | NULL |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Sample Data (First 5 rows)
| id | user_id | name | is_active | created_at |
| --- | --- | --- | --- | --- |
| 1 | 1 | Efectivo | true | Tue Jul 15 2025 18:26:29 GMT-0300 (hora estándar de Argentina) |
| 2 | 1 | Tarjeta | true | Tue Jul 15 2025 18:26:29 GMT-0300 (hora estándar de Argentina) |
| 3 | 1 | QR | true | Tue Jul 15 2025 18:26:29 GMT-0300 (hora estándar de Argentina) |
| 4 | 1 | Transferencia | true | Tue Jul 15 2025 18:26:29 GMT-0300 (hora estándar de Argentina) |
| 6 | 2 | Efectivo | true | Tue Jul 15 2025 18:36:38 GMT-0300 (hora estándar de Argentina) |

### points_config
- **Schema**: public
- **Rows**: 1
- **Columns**: 11

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('points_config_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| product_id | integer | YES | NULL |
| category_id | integer | YES | NULL |
| welcome_points | integer | YES | 0 |
| big_purchase_threshold | numeric | YES | 0 |
| big_purchase_points | integer | YES | 0 |
| points | integer | YES | 0 |
| redeem_points | integer | YES | 0 |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

#### Sample Data (First 5 rows)
| id | user_id | product_id | category_id | welcome_points | big_purchase_threshold | big_purchase_points | points | redeem_points | created_at | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 211 | 2 | 4 | NULL | NULL | NULL | NULL | 10 | 50 | Thu Jul 17 2025 05:50:30 GMT-0300 (hora estándar de Argentina) | Thu Jul 17 2025 17:55:22 GMT-0300 (hora estándar de Argentina) |

### products
- **Schema**: public
- **Rows**: 4
- **Columns**: 9

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('products_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| category_id | integer | YES | NULL |
| name | character varying(255) | NO | NULL |
| description | text | YES | NULL |
| price | numeric | NO | NULL |
| image_url | character varying(500) | YES | NULL |
| is_available | boolean | YES | true |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Sample Data (First 5 rows)
| id | user_id | category_id | name | description | price | image_url | is_available | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 1 | Lomo Completo |  | 23000.00 |  | true | Fri Jul 04 2025 03:44:44 GMT-0300 (hora estándar de Argentina) |
| 2 | 2 | 2 | Mila De la puta madre |  | 40000.00 |  | true | Sun Jul 06 2025 18:26:10 GMT-0300 (hora estándar de Argentina) |
| 3 | 2 | 1 | Lomo De Entraña |  | 30000.00 |  | true | Sun Jul 06 2025 18:52:39 GMT-0300 (hora estándar de Argentina) |
| 4 | 2 | 1 | Lomo De Carne Mechada |  | 37000.00 |  | true | Wed Jul 09 2025 04:58:07 GMT-0300 (hora estándar de Argentina) |

### promotions
- **Schema**: public
- **Rows**: N/A
- **Columns**: 13

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('promotions_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| title | character varying(255) | NO | NULL |
| description | text | YES | NULL |
| discount_type | character varying(50) | YES | NULL |
| discount_value | numeric | YES | NULL |
| conditions | text | YES | NULL |
| start_date | timestamp without time zone | YES | NULL |
| end_date | timestamp without time zone | YES | NULL |
| is_active | boolean | YES | true |
| target_audience | character varying(100) | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### rewards
- **Schema**: public
- **Rows**: N/A
- **Columns**: 6

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('rewards_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| name | character varying(100) | NO | NULL |
| points_cost | integer | NO | NULL |
| description | text | YES | NULL |
| created_at | timestamp without time zone | YES | now() |

### suppliers
- **Schema**: public
- **Rows**: 2
- **Columns**: 10

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('suppliers_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| name | character varying(255) | NO | NULL |
| email | character varying(255) | YES | NULL |
| phone | character varying(50) | YES | NULL |
| address | text | YES | NULL |
| contact_person | character varying(255) | YES | NULL |
| notes | text | YES | NULL |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

#### Sample Data (First 5 rows)
| id | user_id | name | email | phone | address | contact_person | notes | created_at | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | Cafe5Hispanos | NULL | 26266627373 | NULL | Osvaldo | NULL | Fri Jul 18 2025 04:21:54 GMT-0300 (hora estándar de Argentina) | Fri Jul 18 2025 04:21:54 GMT-0300 (hora estándar de Argentina) |
| 2 | 2 | Empanadas lucas | NULL | 26266627373 | NULL | Lucas Carnicero | NULL | Mon Jul 21 2025 16:37:39 GMT-0300 (hora estándar de Argentina) | Mon Jul 21 2025 16:37:39 GMT-0300 (hora estándar de Argentina) |

### user_bots
- **Schema**: public
- **Rows**: 1
- **Columns**: 16

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('user_bots_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| bot_name | text | NO | 'Mi Bot de WhatsApp'::text |
| phone_number | text | YES | NULL |
| qr_code | text | YES | NULL |
| status | text | YES | 'disconnected'::text |
| session_data | jsonb | YES | '{}'::jsonb |
| ai_enabled | boolean | YES | true |
| ai_role | text | YES | 'Eres un asistente virtual amigable y profesional de restaurante.'::text |
| ai_instructions | text | YES | 'Responde de manera cordial y útil. Cuando no tengas información específica, ofrece ayuda general y dirige al cliente a contactar directamente al restaurante. Mantén un tono cálido y profesional.'::text |
| openai_api_key | text | YES | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| name | character varying(255) | YES | NULL |
| is_active | boolean | YES | true |
| default_response | text | YES | NULL |

#### Sample Data (First 5 rows)
| id | user_id | bot_name | phone_number | qr_code | status | session_data | ai_enabled | ai_role | ai_instructions | openai_api_key | created_at | updated_at | name | is_active | default_response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | 2 | Uco | NULL | NULL | disconnected | [object Object] | true | Eres un asistente virtual amigable y profesiona... | Responde de manera cordial y útil. Cuando no te... | AIzaSyCQ2Ah1HR20c8bXmU1zrMtWEIedvpbvJ_4 | Sat Jul 26 2025 17:05:04 GMT-0300 (hora estándar de Argentina) | Sun Aug 03 2025 06:00:25 GMT-0300 (hora estándar de Argentina) | Uco | true | Gracias por tu mensaje. En breve te responderemos. |

### users
- **Schema**: public
- **Rows**: 4
- **Columns**: 7

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('users_id_seq'::regclass) |
| email | character varying(255) | NO | NULL |
| password_hash | character varying(255) | NO | NULL |
| restaurant_name | character varying(255) | NO | NULL |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| full_name | character varying(255) | NO | NULL |
| phone | character varying(50) | NO | NULL |

#### Sample Data (First 5 rows)
| id | email | password_hash | restaurant_name | created_at | full_name | phone |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | alvarogonzalez7070@gmail.com | $2b$12$a5ZFt3aIjgc.QH57cvXSdO7txYtKE.3b.mKWLBmD... | Elsitio | Fri Jul 04 2025 01:51:19 GMT-0300 (hora estándar de Argentina) | Alvaro Gonzalez | 2616977056 |
| 2 | alvarogonzalez408@gmail.com | $2b$12$NWW3Gt5u81OCAYUjWEdnfer1D9IAv5w.gq3C0L8L... | brod | Fri Jul 04 2025 01:56:17 GMT-0300 (hora estándar de Argentina) | juan perez | 2616977057 |
| 3 | as.gonzalez@alumno.etec.um.edu.ar | $2a$12$......................jxS.1IgVDKaw.cWFgJ... | Ñam | Fri Jul 04 2025 04:10:55 GMT-0300 (hora estándar de Argentina) | juan perez | 2616977056 |
| 4 | alvarosantino_05@hotmail.com | $2a$12$......................jxS.1IgVDKaw.cWFgJ... | ñam | Fri Jul 04 2025 04:15:10 GMT-0300 (hora estándar de Argentina) | juan perez | 2616977056 |

### whatsapp_connections
- **Schema**: public
- **Rows**: 1
- **Columns**: 6

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| user_id | integer | NO | NULL |
| status | character varying(50) | NO | 'disconnected'::character varying |
| qr_code | text | YES | NULL |
| phone_number | text | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Sample Data (First 5 rows)
| user_id | status | qr_code | phone_number | created_at | updated_at |
| --- | --- | --- | --- | --- | --- |
| 2 | disconnected | NULL | NULL | Sat Jul 26 2025 14:36:41 GMT-0300 (hora estándar de Argentina) | Wed Jul 30 2025 02:23:14 GMT-0300 (hora estándar de Argentina) |

### whatsapp_conversations
- **Schema**: public
- **Rows**: 4
- **Columns**: 8

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('whatsapp_conversations_id_seq'::regclass) |
| user_id | integer | NO | NULL |
| customer_phone | text | NO | NULL |
| last_message | text | YES | NULL |
| last_message_timestamp | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| context | jsonb | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Sample Data (First 5 rows)
| id | user_id | customer_phone | last_message | last_message_timestamp | context | created_at | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 5492616617727@s.whatsapp.net | si | Sat Jul 26 2025 14:56:36 GMT-0300 (hora estándar de Argentina) | NULL | Sat Jul 26 2025 14:56:23 GMT-0300 (hora estándar de Argentina) | Sat Jul 26 2025 14:56:23 GMT-0300 (hora estándar de Argentina) |
| 3 | 2 | 5492616399640 | 🙌🏼❤️ te amo sos crack | Sat Jul 26 2025 15:38:50 GMT-0300 (hora estándar de Argentina) | NULL | Sat Jul 26 2025 15:16:56 GMT-0300 (hora estándar de Argentina) | Sat Jul 26 2025 15:16:56 GMT-0300 (hora estándar de Argentina) |
| 2 | 2 | 120363060138450981 | JAJSJAJAJAJ | Sat Jul 26 2025 15:39:05 GMT-0300 (hora estándar de Argentina) | NULL | Sat Jul 26 2025 15:16:53 GMT-0300 (hora estándar de Argentina) | Sat Jul 26 2025 15:16:53 GMT-0300 (hora estándar de Argentina) |
| 4 | 2 | 5492616617727 | desactívalo | Wed Jul 30 2025 02:22:59 GMT-0300 (hora estándar de Argentina) | NULL | Sun Jul 27 2025 15:09:31 GMT-0300 (hora estándar de Argentina) | Sun Jul 27 2025 15:09:31 GMT-0300 (hora estándar de Argentina) |

### whatsapp_messages
- **Schema**: public
- **Rows**: 95
- **Columns**: 8

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | nextval('whatsapp_messages_id_seq'::regclass) |
| conversation_id | integer | NO | NULL |
| user_id | integer | NO | NULL |
| message_type | character varying(10) | NO | NULL |
| message_text | text | NO | NULL |
| is_from_bot | boolean | YES | false |
| ai_response_used | boolean | YES | false |
| timestamp | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Sample Data (First 5 rows)
| id | conversation_id | user_id | message_type | message_text | is_from_bot | ai_response_used | timestamp |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 2 | incoming | hola | false | false | Sat Jul 26 2025 14:56:23 GMT-0300 (hora estándar de Argentina) |
| 2 | 1 | 2 | outgoing | Lo siento, hay un problema con el servicio de I... | true | false | Sat Jul 26 2025 14:56:25 GMT-0300 (hora estándar de Argentina) |
| 3 | 1 | 2 | incoming | si | false | false | Sat Jul 26 2025 14:56:36 GMT-0300 (hora estándar de Argentina) |
| 4 | 1 | 2 | outgoing | Lo siento, hay un problema con el servicio de I... | true | false | Sat Jul 26 2025 14:56:38 GMT-0300 (hora estándar de Argentina) |
| 5 | 2 | 2 | incoming | @180238403260661 @150959627997369 pasenme lo de... | false | false | Sat Jul 26 2025 15:16:53 GMT-0300 (hora estándar de Argentina) |

### messages
- **Schema**: realtime
- **Rows**: N/A
- **Columns**: 8

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| topic | text | NO | NULL |
| extension | text | NO | NULL |
| payload | jsonb | YES | NULL |
| event | text | YES | NULL |
| private | boolean | YES | false |
| updated_at | timestamp without time zone | NO | now() |
| inserted_at | timestamp without time zone | NO | now() |
| id | uuid | NO | gen_random_uuid() |

### schema_migrations
- **Schema**: realtime
- **Rows**: 63
- **Columns**: 2

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| version | bigint | NO | NULL |
| inserted_at | timestamp without time zone | YES | NULL |

#### Sample Data (First 5 rows)
| version | inserted_at |
| --- | --- |
| 20211116024918 | Thu Jul 17 2025 16:17:19 GMT-0300 (hora estándar de Argentina) |
| 20211116045059 | Thu Jul 17 2025 16:17:24 GMT-0300 (hora estándar de Argentina) |
| 20211116050929 | Thu Jul 17 2025 16:17:27 GMT-0300 (hora estándar de Argentina) |
| 20211116051442 | Thu Jul 17 2025 16:17:31 GMT-0300 (hora estándar de Argentina) |
| 20211116212300 | Thu Jul 17 2025 16:17:35 GMT-0300 (hora estándar de Argentina) |

### subscription
- **Schema**: realtime
- **Rows**: N/A
- **Columns**: 7

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | bigint | NO | NULL |
| subscription_id | uuid | NO | NULL |
| entity | regclass | NO | NULL |
| filters | ARRAY | NO | '{}'::realtime.user_defined_filter[] |
| claims | jsonb | NO | NULL |
| claims_role | regrole | NO | NULL |
| created_at | timestamp without time zone | NO | timezone('utc'::text, now()) |

### buckets
- **Schema**: storage
- **Rows**: N/A
- **Columns**: 10

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | text | NO | NULL |
| name | text | NO | NULL |
| owner | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| public | boolean | YES | false |
| avif_autodetection | boolean | YES | false |
| file_size_limit | bigint | YES | NULL |
| allowed_mime_types | ARRAY | YES | NULL |
| owner_id | text | YES | NULL |

### migrations
- **Schema**: storage
- **Rows**: 26
- **Columns**: 4

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | integer | NO | NULL |
| name | character varying(100) | NO | NULL |
| hash | character varying(40) | NO | NULL |
| executed_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

#### Sample Data (First 5 rows)
| id | name | hash | executed_at |
| --- | --- | --- | --- |
| 0 | create-migrations-table | e18db593bcde2aca2a408c4d1100f6abba2195df | Thu Jul 17 2025 16:17:15 GMT-0300 (hora estándar de Argentina) |
| 1 | initialmigration | 6ab16121fbaa08bbd11b712d05f358f9b555d777 | Thu Jul 17 2025 16:17:15 GMT-0300 (hora estándar de Argentina) |
| 2 | storage-schema | 5c7968fd083fcea04050c1b7f6253c9771b99011 | Thu Jul 17 2025 16:17:15 GMT-0300 (hora estándar de Argentina) |
| 3 | pathtoken-column | 2cb1b0004b817b29d5b0a971af16bafeede4b70d | Thu Jul 17 2025 16:17:15 GMT-0300 (hora estándar de Argentina) |
| 4 | add-migrations-rls | 427c5b63fe1c5937495d9c635c263ee7a5905058 | Thu Jul 17 2025 16:17:15 GMT-0300 (hora estándar de Argentina) |

### objects
- **Schema**: storage
- **Rows**: N/A
- **Columns**: 12

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | gen_random_uuid() |
| bucket_id | text | YES | NULL |
| name | text | YES | NULL |
| owner | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| last_accessed_at | timestamp with time zone | YES | now() |
| metadata | jsonb | YES | NULL |
| path_tokens | ARRAY | YES | NULL |
| version | text | YES | NULL |
| owner_id | text | YES | NULL |
| user_metadata | jsonb | YES | NULL |

### s3_multipart_uploads
- **Schema**: storage
- **Rows**: N/A
- **Columns**: 9

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | text | NO | NULL |
| in_progress_size | bigint | NO | 0 |
| upload_signature | text | NO | NULL |
| bucket_id | text | NO | NULL |
| key | text | NO | NULL |
| version | text | NO | NULL |
| owner_id | text | YES | NULL |
| created_at | timestamp with time zone | NO | now() |
| user_metadata | jsonb | YES | NULL |

### s3_multipart_uploads_parts
- **Schema**: storage
- **Rows**: N/A
- **Columns**: 10

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | gen_random_uuid() |
| upload_id | text | NO | NULL |
| size | bigint | NO | 0 |
| part_number | integer | NO | NULL |
| bucket_id | text | NO | NULL |
| key | text | NO | NULL |
| etag | text | NO | NULL |
| owner_id | text | YES | NULL |
| version | text | NO | NULL |
| created_at | timestamp with time zone | NO | now() |

### secrets
- **Schema**: vault
- **Rows**: N/A
- **Columns**: 8

#### Structure
| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | gen_random_uuid() |
| name | text | YES | NULL |
| description | text | NO | ''::text |
| secret | text | NO | NULL |
| key_id | uuid | YES | NULL |
| nonce | bytea | YES | vault._crypto_aead_det_noncegen() |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |

## Relationships

| Source Table | Source Column | Target Table | Target Column |
|--------------|---------------|--------------|---------------|
| bot_conversations | user_bot_id | user_bots | id |
| bot_messages | conversation_id | bot_conversations | id |
| chatbot_messages | user_id | users | id |
| expenses | supplier_id | suppliers | id |
| rewards | user_id | users | id |
| user_bots | user_id | users | id |
| whatsapp_messages | conversation_id | whatsapp_conversations | id |
