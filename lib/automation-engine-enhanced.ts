import { sql } from '@/lib/db';
import { sendPromotionalMessageEnhanced } from '@/app/actions/enhanced-chatbot-ai';

export interface AutomationRule {
  id: number;
  user_id: number;
  name: string;
  trigger_type: 'inactive_customer' | 'post_purchase' | 'birthday' | 'points_milestone' | 'reservation_reminder' | 'seasonal' | 'abandoned_cart';
  trigger_conditions: {
    days_inactive?: number;
    points_threshold?: number;
    hours_before_reservation?: number;
    purchase_amount_min?: number;
    specific_date?: string;
    time_of_day?: string;
  };
  action_type: 'send_message' | 'send_discount' | 'add_points' | 'create_promotion';
  action_data: {
    message_template?: string;
    discount_percentage?: number;
    points_to_add?: number;
    promotion_details?: any;
  };
  is_active: boolean;
  last_executed?: string;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

export class AutomationEngine {
  private static instance: AutomationEngine;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  static getInstance(): AutomationEngine {
    if (!AutomationEngine.instance) {
      AutomationEngine.instance = new AutomationEngine();
    }
    return AutomationEngine.instance;
  }

  // Start the automation engine
  start(intervalMinutes: number = 60) {
    if (this.isRunning) {
      console.log('Automation engine is already running');
      return;
    }

    console.log(`Starting automation engine with ${intervalMinutes} minute intervals`);
    this.isRunning = true;

    // Run immediately
    this.processAutomations();

    // Set up recurring execution
    this.intervalId = setInterval(() => {
      this.processAutomations();
    }, intervalMinutes * 60 * 1000);
  }

  // Stop the automation engine
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('Automation engine stopped');
  }

  // Process all active automation rules
  private async processAutomations() {
    try {
      console.log('Processing automation rules...');
      
      const activeRules = await this.getActiveAutomationRules();
      console.log(`Found ${activeRules.length} active automation rules`);

      for (const rule of activeRules) {
        try {
          await this.processAutomationRule(rule);
        } catch (error) {
          console.error(`Error processing rule ${rule.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in automation engine:', error);
    }
  }

  // Get all active automation rules
  private async getActiveAutomationRules(): Promise<AutomationRule[]> {
    try {
      const rules = await sql(`
        SELECT * FROM automation_rules 
        WHERE is_active = true
        ORDER BY user_id, created_at
      `);
      
      return rules.map(rule => ({
        ...rule,
        trigger_conditions: typeof rule.trigger_conditions === 'string' 
          ? JSON.parse(rule.trigger_conditions) 
          : rule.trigger_conditions,
        action_data: typeof rule.action_data === 'string' 
          ? JSON.parse(rule.action_data) 
          : rule.action_data
      }));
    } catch (error) {
      console.error('Error getting automation rules:', error);
      return [];
    }
  }

  // Process a single automation rule
  private async processAutomationRule(rule: AutomationRule) {
    console.log(`Processing rule: ${rule.name} (${rule.trigger_type})`);

    // Check if enough time has passed since last execution
    if (rule.last_executed) {
      const lastExecution = new Date(rule.last_executed);
      const now = new Date();
      const hoursSinceLastExecution = (now.getTime() - lastExecution.getTime()) / (1000 * 60 * 60);

      // Don't execute more than once per hour for most rules
      if (hoursSinceLastExecution < 1 && rule.trigger_type !== 'reservation_reminder') {
        return;
      }
    }

    switch (rule.trigger_type) {
      case 'inactive_customer':
        await this.processInactiveCustomerRule(rule);
        break;
      case 'post_purchase':
        await this.processPostPurchaseRule(rule);
        break;
      case 'birthday':
        await this.processBirthdayRule(rule);
        break;
      case 'points_milestone':
        await this.processPointsMilestoneRule(rule);
        break;
      case 'reservation_reminder':
        await this.processReservationReminderRule(rule);
        break;
      case 'seasonal':
        await this.processSeasonalRule(rule);
        break;
      case 'abandoned_cart':
        await this.processAbandonedCartRule(rule);
        break;
    }
  }

  // Process inactive customer automation
  private async processInactiveCustomerRule(rule: AutomationRule) {
    try {
      const daysInactive = rule.trigger_conditions.days_inactive || 30;
      
      const inactiveCustomers = await sql(`
        SELECT DISTINCT c.id, c.name, c.phone, c.user_id, c.points
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE c.user_id = $1 
        AND c.phone IS NOT NULL
        AND (
          o.id IS NULL 
          OR MAX(o.created_at) < CURRENT_DATE - INTERVAL '${daysInactive} days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM automation_executions ae
          WHERE ae.automation_rule_id = $2 
          AND ae.customer_phone = c.phone
          AND ae.executed_at > CURRENT_DATE - INTERVAL '7 days'
        )
        GROUP BY c.id, c.name, c.phone, c.user_id, c.points
        LIMIT 10
      `, [rule.user_id, rule.id]);

      for (const customer of inactiveCustomers) {
        await this.executeCustomerAutomation(rule, customer, 'inactive_customer');
      }

      if (inactiveCustomers.length > 0) {
        await this.updateRuleExecution(rule.id, inactiveCustomers.length);
      }
    } catch (error) {
      console.error('Error processing inactive customer rule:', error);
    }
  }

  // Process post-purchase automation
  private async processPostPurchaseRule(rule: AutomationRule) {
    try {
      const recentOrders = await sql(`
        SELECT o.*, c.phone, c.name as customer_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.user_id = $1 
        AND o.created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
        AND o.status = 'completed'
        AND c.phone IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM automation_executions ae
          WHERE ae.automation_rule_id = $2 
          AND ae.customer_phone = c.phone
          AND ae.related_order_id = o.id
        )
      `, [rule.user_id, rule.id]);

      for (const order of recentOrders) {
        await this.executeOrderAutomation(rule, order, 'thank_you');
      }

      if (recentOrders.length > 0) {
        await this.updateRuleExecution(rule.id, recentOrders.length);
      }
    } catch (error) {
      console.error('Error processing post-purchase rule:', error);
    }
  }

  // Process birthday automation
  private async processBirthdayRule(rule: AutomationRule) {
    try {
      // Note: This assumes you have a birthday field in customers table
      const birthdayCustomers = await sql(`
        SELECT c.id, c.name, c.phone, c.user_id
        FROM customers c
        WHERE c.user_id = $1 
        AND c.phone IS NOT NULL
        AND EXTRACT(MONTH FROM c.birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM c.birthday) = EXTRACT(DAY FROM CURRENT_DATE)
        AND NOT EXISTS (
          SELECT 1 FROM automation_executions ae
          WHERE ae.automation_rule_id = $2 
          AND ae.customer_phone = c.phone
          AND DATE(ae.executed_at) = CURRENT_DATE
        )
      `, [rule.user_id, rule.id]);

      for (const customer of birthdayCustomers) {
        const customMessage = rule.action_data.message_template?.replace('{customer_name}', customer.name) ||
          `¡Feliz cumpleaños, ${customer.name}! 🎉 Te deseamos un día maravilloso. Como regalo, tienes 20% de descuento en tu próxima visita. ¡Celebra con nosotros! 🎂`;
        
        await sendPromotionalMessageEnhanced(rule.user_id, customer.phone, 'birthday', customMessage);
        await this.logAutomationExecution(rule.id, customer.phone, 'birthday_message', { customer_id: customer.id });
      }

      if (birthdayCustomers.length > 0) {
        await this.updateRuleExecution(rule.id, birthdayCustomers.length);
      }
    } catch (error) {
      console.error('Error processing birthday rule:', error);
    }
  }

  // Process points milestone automation
  private async processPointsMilestoneRule(rule: AutomationRule) {
    try {
      const pointsThreshold = rule.trigger_conditions.points_threshold || 100;
      
      const milestoneCustomers = await sql(`
        SELECT c.id, c.name, c.phone, c.user_id, c.points
        FROM customers c
        WHERE c.user_id = $1 
        AND c.phone IS NOT NULL
        AND c.points >= $2
        AND NOT EXISTS (
          SELECT 1 FROM automation_executions ae
          WHERE ae.automation_rule_id = $3 
          AND ae.customer_phone = c.phone
          AND ae.executed_at > CURRENT_DATE - INTERVAL '30 days'
        )
      `, [rule.user_id, pointsThreshold, rule.id]);

      for (const customer of milestoneCustomers) {
        await this.executeCustomerAutomation(rule, customer, 'points_reminder');
      }

      if (milestoneCustomers.length > 0) {
        await this.updateRuleExecution(rule.id, milestoneCustomers.length);
      }
    } catch (error) {
      console.error('Error processing points milestone rule:', error);
    }
  }

  // Process reservation reminder automation
  private async processReservationReminderRule(rule: AutomationRule) {
    try {
      const hoursBefore = rule.trigger_conditions.hours_before_reservation || 2;
      
      const upcomingReservations = await sql(`
        SELECT r.*, c.name as customer_name
        FROM reservations r
        LEFT JOIN customers c ON r.customer_id = c.id
        WHERE r.user_id = $1 
        AND r.status = 'confirmed'
        AND r.customer_phone IS NOT NULL
        AND (r.reservation_date + r.reservation_time::TIME) 
            BETWEEN CURRENT_TIMESTAMP + INTERVAL '${hoursBefore} hours' 
            AND CURRENT_TIMESTAMP + INTERVAL '${hoursBefore + 1} hours'
        AND NOT EXISTS (
          SELECT 1 FROM automation_executions ae
          WHERE ae.automation_rule_id = $2 
          AND ae.customer_phone = r.customer_phone
          AND ae.related_reservation_id = r.id
        )
      `, [rule.user_id, rule.id]);

      for (const reservation of upcomingReservations) {
        const customerName = reservation.customer_name || reservation.customer_name;
        const customMessage = rule.action_data.message_template?.replace('{customer_name}', customerName) ||
          `Hola ${customerName}, te recordamos tu reserva para hoy a las ${reservation.reservation_time} para ${reservation.party_size} personas. ¡Te esperamos! 📅`;
        
        await sendPromotionalMessageEnhanced(rule.user_id, reservation.customer_phone, 'reservation_reminder', customMessage);
        await this.logAutomationExecution(rule.id, reservation.customer_phone, 'reservation_reminder', { 
          reservation_id: reservation.id 
        });
      }

      if (upcomingReservations.length > 0) {
        await this.updateRuleExecution(rule.id, upcomingReservations.length);
      }
    } catch (error) {
      console.error('Error processing reservation reminder rule:', error);
    }
  }

  // Process seasonal automation
  private async processSeasonalRule(rule: AutomationRule) {
    try {
      if (!rule.trigger_conditions.specific_date) return;

      const today = new Date().toISOString().split('T')[0];
      if (rule.trigger_conditions.specific_date !== today) return;

      // Get all customers for this user
      const customers = await sql(`
        SELECT c.id, c.name, c.phone, c.user_id
        FROM customers c
        WHERE c.user_id = $1 
        AND c.phone IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM automation_executions ae
          WHERE ae.automation_rule_id = $2 
          AND ae.customer_phone = c.phone
          AND DATE(ae.executed_at) = CURRENT_DATE
        )
        LIMIT 50
      `, [rule.user_id, rule.id]);

      for (const customer of customers) {
        const customMessage = rule.action_data.message_template?.replace('{customer_name}', customer.name);
        
        if (customMessage) {
          await sendPromotionalMessageEnhanced(rule.user_id, customer.phone, 'seasonal', customMessage);
          await this.logAutomationExecution(rule.id, customer.phone, 'seasonal_message', { customer_id: customer.id });
        }
      }

      if (customers.length > 0) {
        await this.updateRuleExecution(rule.id, customers.length);
      }
    } catch (error) {
      console.error('Error processing seasonal rule:', error);
    }
  }

  // Process abandoned cart automation (future feature)
  private async processAbandonedCartRule(rule: AutomationRule) {
    // This would require tracking cart/order state in chatbot conversations
    console.log('Abandoned cart automation not yet implemented');
  }

  // Execute customer-based automation
  private async executeCustomerAutomation(rule: AutomationRule, customer: any, messageType: string) {
    try {
      const customMessage = rule.action_data.message_template?.replace('{customer_name}', customer.name);
      
      await sendPromotionalMessageEnhanced(rule.user_id, customer.phone, messageType, customMessage);
      await this.logAutomationExecution(rule.id, customer.phone, messageType, { customer_id: customer.id });
    } catch (error) {
      console.error('Error executing customer automation:', error);
    }
  }

  // Execute order-based automation
  private async executeOrderAutomation(rule: AutomationRule, order: any, messageType: string) {
    try {
      const customMessage = rule.action_data.message_template?.replace('{customer_name}', order.customer_name);
      
      await sendPromotionalMessageEnhanced(rule.user_id, order.phone, messageType, customMessage);
      await this.logAutomationExecution(rule.id, order.phone, messageType, { 
        order_id: order.id,
        customer_id: order.customer_id 
      });
    } catch (error) {
      console.error('Error executing order automation:', error);
    }
  }

  // Log automation execution
  private async logAutomationExecution(
    ruleId: number, 
    customerPhone: string, 
    actionType: string, 
    metadata: any = {}
  ) {
    try {
      await sql(`
        INSERT INTO automation_executions (
          automation_rule_id, customer_phone, action_type, metadata, executed_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [ruleId, customerPhone, actionType, JSON.stringify(metadata)]);
    } catch (error) {
      console.error('Error logging automation execution:', error);
    }
  }

  // Update rule execution statistics
  private async updateRuleExecution(ruleId: number, executionCount: number) {
    try {
      await sql(`
        UPDATE automation_rules 
        SET last_executed = CURRENT_TIMESTAMP, 
            execution_count = execution_count + $2
        WHERE id = $1
      `, [ruleId, executionCount]);
    } catch (error) {
      console.error('Error updating rule execution:', error);
    }
  }

  // Get automation statistics
  async getAutomationStats(userId: number, period: 'today' | 'week' | 'month' = 'today') {
    try {
      let dateFilter = '';
      
      switch (period) {
        case 'today':
          dateFilter = "DATE(executed_at) = CURRENT_DATE";
          break;
        case 'week':
          dateFilter = "executed_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          dateFilter = "executed_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
      }

      const stats = await sql(`
        SELECT 
          ar.trigger_type,
          COUNT(ae.id) as execution_count,
          COUNT(DISTINCT ae.customer_phone) as unique_customers
        FROM automation_rules ar
        LEFT JOIN automation_executions ae ON ar.id = ae.automation_rule_id
        WHERE ar.user_id = $1 AND ar.is_active = true
        ${dateFilter ? `AND ${dateFilter}` : ''}
        GROUP BY ar.trigger_type
      `, [userId]);

      return stats;
    } catch (error) {
      console.error('Error getting automation stats:', error);
      return [];
    }
  }
}

// Initialize and export singleton instance
export const automationEngine = AutomationEngine.getInstance();