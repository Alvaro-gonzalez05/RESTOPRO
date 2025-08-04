import { GoogleGenerativeAI } from '@google/generative-ai';
import { sql } from '@/lib/db';
import { createReservation, checkTimeSlotAvailability, getAvailableTimeSlots } from '@/app/actions/reservations';

export interface ChatbotContext {
  customer?: {
    id: number;
    name: string;
    phone: string;
    email?: string;
    points: number;
    total_spent: number;
    orders_count: number;
  };
  businessInfo?: {
    business_name: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    menu_link?: string;
    location_link?: string;
    business_hours?: any;
    delivery_info?: string;
  };
  products?: Array<{
    id: number;
    name: string;
    description?: string;
    price: number;
    category_id?: number;
    category_name?: string;
    is_available: boolean;
  }>;
  categories?: Array<{
    id: number;
    name: string;
  }>;
  botConfig?: {
    bot_name: string;
    ai_role: string;
    ai_instructions: string;
    openai_api_key: string;
  };
}

export interface ConversationState {
  intent?: 'greeting' | 'menu' | 'order' | 'reservation' | 'hours' | 'location' | 'points' | 'general';
  orderInProgress?: {
    items: Array<{
      product_id: number;
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      is_reward?: boolean;
      points_used?: number;
    }>;
    customer_name?: string;
    customer_id?: number;
    total: number;
    points_total?: number;
    notes?: string;
  };
  reservationInProgress?: {
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    customer_id?: number;
    date?: string;
    time?: string;
    party_size?: number;
    special_requests?: string;
  };
  rewardRedemption?: {
    reward_id: number;
    reward_name: string;
    points_required: number;
  };
  customerRegistration?: {
    step: 'asking_name' | 'asking_phone';
    first_name?: string;
    phone?: string;
    purpose: 'order' | 'reservation';
  };
  awaitingConfirmation?: 'order' | 'reservation' | 'reward_redemption' | 'customer_registration' | 'order_details';
  lastInteractionType?: string;
}

export class EnhancedChatbotAI {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationStates: Map<string, ConversationState> = new Map();
  private conversationMemory: Map<string, string[]> = new Map(); // Store recent messages

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async processMessage(
    userId: number,
    customerPhone: string,
    message: string,
    context: ChatbotContext
  ): Promise<{
    response: string;
    actions?: Array<{
      type: 'create_order' | 'create_reservation' | 'show_menu' | 'check_availability';
      data?: any;
    }>;
    conversationState?: ConversationState;
  }> {
    try {
      // Get or initialize conversation state
      const stateKey = `${userId}-${customerPhone}`;
      let state = this.conversationStates.get(stateKey) || {};

      // Load conversation memory from database
      await this.loadConversationMemory(userId, customerPhone);
      
      // Add current message to memory
      await this.addMessageToMemory(userId, customerPhone, message, false);

      // Analyze message intent
      const intent = await this.analyzeIntent(message, state, context);
      state.intent = intent;

      let response = '';
      let actions: any[] = [];

      switch (intent) {
        case 'order':
          const orderResult = await this.handleOrderIntent(message, state, context, userId, customerPhone);
          response = orderResult.response;
          actions = orderResult.actions || [];
          state = { ...state, ...orderResult.state };
          break;

        case 'reservation':
          const reservationResult = await this.handleReservationIntent(message, state, context, userId, customerPhone);
          response = reservationResult.response;
          actions = reservationResult.actions || [];
          state = { ...state, ...reservationResult.state };
          break;

        case 'menu':
          response = await this.handleMenuRequest(context);
          break;

        case 'hours':
          response = this.handleHoursRequest(context);
          break;

        case 'location':
          response = this.handleLocationRequest(context);
          break;

        case 'points':
          response = await this.handlePointsRequest(message, state, context, userId);
          break;

        case 'reward_confirmation':
          const redemptionResult = await this.processRewardRedemption(state, context, userId);
          response = redemptionResult.response;
          if (redemptionResult.success) {
            state.rewardRedemption = undefined;
            state.awaitingConfirmation = undefined;
          }
          break;

        case 'customer_registration':
          const registrationResult = await this.handleCustomerRegistration(message, state, context, userId);
          response = registrationResult.response;
          actions = registrationResult.actions || [];
          state = { ...state, ...registrationResult.state };
          break;

        case 'order_details':
          const detailsResult = await this.handleOrderDetails(message, state, context, userId);
          response = detailsResult.response;
          actions = detailsResult.actions || [];
          state = { ...state, ...detailsResult.state };
          break;

        default:
          response = await this.generateGeneralResponse(message, context, state, customerPhone, userId);
      }

      // Add bot response to memory
      await this.addMessageToMemory(userId, customerPhone, response, true);
      
      // Save conversation state to database
      await this.saveConversationMemory(userId, customerPhone, state);
      
      // Save conversation state in memory
      this.conversationStates.set(stateKey, state);

      // Clean up old states (older than 1 hour)
      this.cleanupOldStates();

      return {
        response,
        actions,
        conversationState: state
      };

    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: 'Lo siento, hubo un problema procesando tu mensaje. ¿Puedes intentar de nuevo?'
      };
    }
  }

  private async analyzeIntent(
    message: string,
    state: ConversationState,
    context: ChatbotContext
  ): Promise<string> {
    const text = message.toLowerCase();

    // Check if we're in the middle of an order or reservation process
    if (state.awaitingConfirmation === 'order') {
      if (text.includes('sí') || text.includes('si') || text.includes('confirmar') || text.includes('ok')) {
        return 'order';
      }
    }

    if (state.awaitingConfirmation === 'reservation') {
      if (text.includes('sí') || text.includes('si') || text.includes('confirmar') || text.includes('ok')) {
        return 'reservation';
      }
    }

    if (state.awaitingConfirmation === 'reward_redemption') {
      if (text.includes('sí') || text.includes('si') || text.includes('confirmar') || text.includes('ok')) {
        return 'reward_confirmation';
      }
    }

    if (state.awaitingConfirmation === 'customer_registration') {
      return 'customer_registration';
    }

    if (state.awaitingConfirmation === 'order_details') {
      return 'order_details';
    }

    // Detect reservation intent FIRST to avoid confusion with order keywords
    if (text.includes('reserva') || text.includes('mesa') || text.includes('reservar') ||
        text.includes('agendar') || text.includes('cita') || text.includes('disponibilidad')) {
      return 'reservation';
    }

    // Enhanced order intent detection - check for food items or order keywords
    const orderKeywords = [
      'pedir', 'orden', 'quiero', 'me das', 'solicitar', 'comprar', 
      'agregar', 'añadir', 'quisiera', 'necesito', 'llevaria', 'llevaría',
      'dame', 'traeme', 'tráeme', 'voy a pedir', 'me gustaria', 'me gustaría'
    ];

    const foodKeywords = [
      'lomo', 'hamburguesa', 'pizza', 'pollo', 'carne', 'pasta', 'ensalada',
      'sandwich', 'empanada', 'milanesa', 'asado', 'completo', 'papas',
      'bebida', 'gaseosa', 'agua', 'cerveza', 'vino', 'jugo', 'café',
      'postre', 'helado', 'flan', 'torta', 'brownie'
    ];

    // Check if there's any order keyword OR food keyword
    const hasOrderKeyword = orderKeywords.some(keyword => text.includes(keyword));
    const hasFoodKeyword = foodKeywords.some(keyword => text.includes(keyword));
    
    // Also check if there are any actual products mentioned
    const hasProductMention = context.products?.some(product => {
      const productName = product.name.toLowerCase();
      return text.includes(productName) || 
             text.includes(productName.split(' ')[0]) ||
             productName.split(' ').some(word => word.length > 3 && text.includes(word));
    });

    if (hasOrderKeyword || hasFoodKeyword || hasProductMention) {
      return 'order';
    }

    // Detect points/rewards intent and redemption
    if (text.includes('puntos') || text.includes('recompensa') || text.includes('canjear') ||
        text.includes('premio') || text.includes('descuento') || text.includes('gratis')) {
      return 'points';
    }

    // Detect menu request
    if (text.includes('menu') || text.includes('menú') || text.includes('carta') ||
        text.includes('productos') || text.includes('comida') || text.includes('platillos')) {
      return 'menu';
    }

    // Detect hours request
    if (text.includes('horario') || text.includes('hora') || text.includes('abierto') ||
        text.includes('cerrado') || text.includes('abren') || text.includes('cierran')) {
      return 'hours';
    }

    // Detect location request
    if (text.includes('direccion') || text.includes('dirección') || text.includes('ubicacion') ||
        text.includes('ubicación') || text.includes('donde') || text.includes('localización')) {
      return 'location';
    }

    return 'general';
  }

  private async handleOrderIntent(
    message: string,
    state: ConversationState,
    context: ChatbotContext,
    userId: number,
    customerPhone: string
  ): Promise<{
    response: string;
    actions?: any[];
    state?: Partial<ConversationState>;
  }> {
    const text = message.toLowerCase();

    // If awaiting confirmation
    if (state.awaitingConfirmation === 'order') {
      if (text.includes('sí') || text.includes('si') || text.includes('confirmar') || text.includes('ok')) {
        // Create the order
        if (state.orderInProgress) {
          const orderData = await this.createOrderFromState(state.orderInProgress, userId, context.customer);
          
          if (orderData.success) {
            return {
              response: `¡Perfecto! Tu orden #${orderData.orderId} ha sido confirmada. ` +
                       `Total: $${state.orderInProgress.total.toFixed(2)}. ` +
                       `Te notificaremos cuando esté lista. ¡Gracias por tu compra! 🎉`,
              actions: [{ type: 'create_order', data: orderData }],
              state: { orderInProgress: undefined, awaitingConfirmation: undefined }
            };
          } else {
            return {
              response: 'Hubo un problema creando tu orden. ¿Puedes intentar de nuevo?',
              state: { orderInProgress: undefined, awaitingConfirmation: undefined }
            };
          }
        }
      } else {
        return {
          response: 'Orden cancelada. ¿En qué más puedo ayudarte?',
          state: { orderInProgress: undefined, awaitingConfirmation: undefined }
        };
      }
    }

    // Extract products from message
    const extractedProducts = await this.extractProductsFromMessage(message, context.products || []);
    
    if (extractedProducts.length === 0) {
      // Try to suggest similar products or show menu
      const availableProducts = context.products?.filter(p => p.is_available) || [];
      if (availableProducts.length === 0) {
        return {
          response: 'Lo siento, actualmente no tenemos productos disponibles. Por favor contacta al restaurante directamente. 📞'
        };
      }
      
      // Enhanced product suggestion based on keywords in the message
      const text = message.toLowerCase();
      const suggestions = this.findSimilarProducts(text, availableProducts);
      
      if (suggestions.length > 0) {
        const suggestionText = suggestions.slice(0, 3).map(p => {
          const price = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
          return `${p.name} - ${price.toFixed(2)}`;
        }).join('\n• ');
        return {
          response: `No encontré exactamente lo que buscas, pero tenemos estas opciones similares:\n\n• ${suggestionText}\n\n¿Te interesa alguna de estas opciones? Solo dime cuál quieres. 😊`
        };
      }
      
      // If no similar products, show general menu suggestion
      const popularProducts = availableProducts.slice(0, 3);
      return {
        response: `¿Qué te gustaría pedir? Tenemos estas opciones populares:\n\n• ${popularProducts.map(p => {
          const price = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
          return `${p.name} - ${price.toFixed(2)}`;
        }).join('\n• ')}\n\n¿Te interesa alguna de estas o prefieres ver el menú completo? 📋`
      };
    }

    // Check for unavailable products
    const unavailableProducts = extractedProducts.filter(p => !p.is_available);
    if (unavailableProducts.length > 0) {
      const unavailableNames = unavailableProducts.map(p => p.name).join(', ');
      return {
        response: `Lo siento, ${unavailableNames} no ${unavailableProducts.length > 1 ? 'están disponibles' : 'está disponible'} en este momento. ¿Te gustaría pedir algo más de nuestro menú? 😔`
      };
    }

    // Initialize or update order
    if (!state.orderInProgress) {
      state.orderInProgress = {
        items: [],
        total: 0
      };
    }

    // Add products to order
    extractedProducts.forEach(product => {
      const existingItem = state.orderInProgress!.items.find(item => item.product_id === product.id);
      if (existingItem) {
        existingItem.quantity += product.quantity;
        existingItem.total_price = existingItem.quantity * existingItem.unit_price;
      } else {
        state.orderInProgress!.items.push({
          product_id: product.id,
          product_name: product.name,
          quantity: product.quantity,
          unit_price: product.price,
          total_price: product.quantity * product.price
        });
      }
    });

    // Calculate total
    state.orderInProgress.total = state.orderInProgress.items.reduce((sum, item) => sum + item.total_price, 0);

    // Set customer info if available, otherwise trigger registration
    if (context.customer) {
      state.orderInProgress.customer_name = context.customer.name;
      state.orderInProgress.customer_id = context.customer.id;
    } else {
      // Try to find customer by phone number first
      const cleanPhone = customerPhone.replace(/whatsapp:|[\\s\\-\\(\\)]/g, '');
      const existingCustomerByPhone = await this.findCustomerByPhone(userId, cleanPhone);
      
      if (existingCustomerByPhone) {
        // Customer found by phone, use their info
        state.orderInProgress.customer_name = existingCustomerByPhone.name;
        state.orderInProgress.customer_id = existingCustomerByPhone.id;
      } else {
        // Customer not found, need to register them first
        return {
          response: '¡Perfecto! Para procesar tu pedido necesito algunos datos. ¿Cuál es tu nombre?',
          state: {
            orderInProgress: state.orderInProgress,
            customerRegistration: {
              step: 'asking_name',
              purpose: 'order',
              phone: cleanPhone
            },
            awaitingConfirmation: 'customer_registration'
          }
        };
      }
    }

    // Generate order summary
    const orderSummary = this.generateOrderSummary(state.orderInProgress);
    
    return {
      response: `He agregado esto a tu orden:\n\n${orderSummary}\n\n` +
               `¿Quieres agregar algún detalle o comentario a tu orden? (Ej: "sin cebolla", "bien cocido", etc.)\n\n` +
               `Responde con el detalle o "no" si no quieres agregar nada. 📝`,
      state: { 
        orderInProgress: state.orderInProgress, 
        awaitingConfirmation: 'order_details' as const,
        lastInteractionType: 'asking_details'
      }
    };
  }

  private async handleReservationIntent(
    message: string,
    state: ConversationState,
    context: ChatbotContext,
    userId: number,
    customerPhone: string
  ): Promise<{
    response: string;
    actions?: any[];
    state?: Partial<ConversationState>;
  }> {
    const text = message.toLowerCase();

    // If awaiting confirmation
    if (state.awaitingConfirmation === 'reservation') {
      if (text.includes('sí') || text.includes('si') || text.includes('confirmar') || text.includes('ok')) {
        if (state.reservationInProgress) {
          const reservation = state.reservationInProgress;
          
          if (reservation.date && reservation.time && reservation.party_size && reservation.customer_name) {
            const result = await createReservation({
              userId,
              customerName: reservation.customer_name,
              customerPhone: reservation.customer_phone || customerPhone || '',
              customerEmail: reservation.customer_email,
              reservationDate: reservation.date,
              reservationTime: reservation.time,
              partySize: reservation.party_size,
              specialRequests: reservation.special_requests,
              createdVia: 'chatbot'
            });

            if (result.success) {
              return {
                response: `¡Perfecto! Tu reserva ha sido confirmada para el ${reservation.date} a las ${reservation.time} ` +
                         `para ${reservation.party_size} personas. Te esperamos! 🎉`,
                actions: [{ type: 'create_reservation', data: result.reservation }],
                state: { reservationInProgress: undefined, awaitingConfirmation: undefined }
              };
            } else {
              return {
                response: `Hubo un problema con tu reserva: ${result.error}. ¿Quieres intentar con otra fecha u hora?`,
                state: { awaitingConfirmation: undefined }
              };
            }
          }
        }
      } else {
        return {
          response: 'Reserva cancelada. ¿En qué más puedo ayudarte?',
          state: { reservationInProgress: undefined, awaitingConfirmation: undefined }
        };
      }
    }

    // Extract reservation details from message
    const reservationData = await this.extractReservationData(message, context);
    
    if (!state.reservationInProgress) {
      state.reservationInProgress = {};
    }

    // Update reservation data
    Object.assign(state.reservationInProgress, reservationData);

    // Set customer data if available, otherwise trigger registration
    if (context.customer) {
      state.reservationInProgress.customer_name = context.customer.name;
      state.reservationInProgress.customer_phone = context.customer.phone;
      state.reservationInProgress.customer_email = context.customer.email;
      state.reservationInProgress.customer_id = context.customer.id;
    } else {
      // Try to find customer by phone number first
      const cleanPhone = customerPhone.replace(/whatsapp:|[\\s\\-\\(\\)]/g, '');
      const existingCustomerByPhone = await this.findCustomerByPhone(userId, cleanPhone);
      
      if (existingCustomerByPhone) {
        // Customer found by phone, use their info
        state.reservationInProgress.customer_name = existingCustomerByPhone.name;
        state.reservationInProgress.customer_phone = existingCustomerByPhone.phone;
        state.reservationInProgress.customer_email = existingCustomerByPhone.email;
        state.reservationInProgress.customer_id = existingCustomerByPhone.id;
      } else {
        // Customer not found, need to register them first
        return {
          response: '¡Perfecto! Para hacer tu reserva necesito algunos datos. ¿Cuál es tu nombre?',
          state: {
            reservationInProgress: state.reservationInProgress,
            customerRegistration: {
              step: 'asking_name',
              purpose: 'reservation',
              phone: cleanPhone
            },
            awaitingConfirmation: 'customer_registration'
          }
        };
      }
    }

    // Check what information is missing
    const missing = this.getMissingReservationInfo(state.reservationInProgress);
    
    if (missing.length > 0) {
      const prompts = {
        date: '¿Para qué fecha quieres la reserva? (por ejemplo: 2024-01-15)',
        time: '¿A qué hora prefieres? (por ejemplo: 19:30)',
        party_size: '¿Para cuántas personas?',
        customer_name: '¿A nombre de quién hago la reserva?'
      };

      const missingField = missing[0];
      return {
        response: `Para completar tu reserva necesito saber: ${prompts[missingField as keyof typeof prompts]}`,
        state: { reservationInProgress: state.reservationInProgress }
      };
    }

    // All data available, check availability
    const availability = await checkTimeSlotAvailability(
      userId,
      state.reservationInProgress.date!,
      state.reservationInProgress.time!
    );

    if (!availability.available) {
      // Suggest alternative times
      const availableSlots = await getAvailableTimeSlots(userId, state.reservationInProgress.date!);
      const alternatives = availableSlots.slice(0, 3).join(', ');
      
      return {
        response: `Lo siento, esa hora no está disponible. ${availability.reason}\n\n` +
                 (alternatives ? `¿Te parece alguna de estas horas?: ${alternatives}` : 
                  'Te sugiero que pruebes con otra fecha u hora.'),
        state: { reservationInProgress: state.reservationInProgress }
      };
    }

    // Generate reservation summary
    const summary = `Reserva para ${state.reservationInProgress.customer_name}:\n` +
                   `📅 Fecha: ${state.reservationInProgress.date}\n` +
                   `🕐 Hora: ${state.reservationInProgress.time}\n` +
                   `👥 Personas: ${state.reservationInProgress.party_size}\n` +
                   (state.reservationInProgress.special_requests ? 
                    `📝 Notas: ${state.reservationInProgress.special_requests}\n` : '');

    return {
      response: `${summary}\n¿Confirmas tu reserva? Responde "sí" para confirmar. ✅`,
      state: { 
        reservationInProgress: state.reservationInProgress, 
        awaitingConfirmation: 'reservation' as const 
      }
    };
  }

  private async handleMenuRequest(context: ChatbotContext): Promise<string> {
    if (!context.products || context.products.length === 0) {
      if (context.businessInfo?.menu_link) {
        return `Puedes ver nuestro menú completo aquí: ${context.businessInfo.menu_link} 📋`;
      }
      return 'En este momento no tengo el menú disponible. Por favor contacta al restaurante directamente. 📋';
    }

    // Group products by category
    const categories = context.categories || [];
    const menuByCategory: { [key: string]: typeof context.products } = {};

    context.products.forEach(product => {
      if (!product.is_available) return;
      
      const categoryName = categories.find(c => c.id === product.category_id)?.name || 'Otros';
      if (!menuByCategory[categoryName]) {
        menuByCategory[categoryName] = [];
      }
      menuByCategory[categoryName].push(product);
    });

    let menuText = '🍽️ **Nuestro Menú:**\n\n';
    
    Object.entries(menuByCategory).forEach(([category, products]) => {
      menuText += `**${category}:**\n`;
      products.forEach(product => {
        const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
        menuText += `• ${product.name} - ${price.toFixed(2)}\n`;
        if (product.description) {
          menuText += `  ${product.description}\n`;
        }
      });
      menuText += '\n';
    });

    menuText += '¿Qué te gustaría pedir? 😊';
    
    return menuText;
  }

  private handleHoursRequest(context: ChatbotContext): string {
    if (!context.businessInfo?.business_hours) {
      return 'Para conocer nuestros horarios, por favor contacta al restaurante directamente. 🕐';
    }

    try {
      const hours = typeof context.businessInfo.business_hours === 'string' 
        ? JSON.parse(context.businessInfo.business_hours)
        : context.businessInfo.business_hours;

      const daysTranslation: { [key: string]: string } = {
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miércoles': 'Miércoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes',
        'sábado': 'Sábado',
        'domingo': 'Domingo'
      };

      const dayOrder = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

      let hoursText = '🕐 **Nuestros Horarios:**\n\n';
      
      dayOrder.forEach(day => {
        if (hours[day]) {
          const time = hours[day];
          const dayName = daysTranslation[day];
          
          if (time.closed) {
            hoursText += `🔴 ${dayName}: Cerrado\n`;
          } else if (time.from && time.to) {
            hoursText += `🟢 ${dayName}: ${time.from} - ${time.to}\n`;
          }
        }
      });

      return hoursText;
    } catch (error) {
      return 'Para conocer nuestros horarios, por favor contacta al restaurante directamente. 🕐';
    }
  }

  private handleLocationRequest(context: ChatbotContext): string {
    let response = '📍 **Nuestra Ubicación:**\n\n';
    
    if (context.businessInfo?.address) {
      response += `📍 ${context.businessInfo.address}\n`;
    }
    
    if (context.businessInfo?.phone) {
      response += `📞 ${context.businessInfo.phone}\n`;
    }
    
    if (context.businessInfo?.location_link) {
      response += `🗺️ Ver en mapa: ${context.businessInfo.location_link}\n`;
    }

    if (!context.businessInfo?.address && !context.businessInfo?.phone) {
      response = 'Para conocer nuestra ubicación, por favor contacta al restaurante directamente. 📍';
    }

    return response;
  }

  private async handlePointsRequest(
    message: string,
    state: ConversationState,
    context: ChatbotContext,
    userId: number
  ): Promise<string> {
    if (!context.customer) {
      return '🔍 Para consultar tus puntos, necesito que primero te identifiques. ¿Podrías decirme tu nombre y número de teléfono?';
    }

    const customerPoints = context.customer.points || 0;
    const text = message.toLowerCase();

    // Check if customer wants to redeem a specific reward
    if (text.includes('canjear') && (text.includes('quiero') || text.includes('deseo'))) {
      return await this.handleRewardRedemption(message, state, context, userId);
    }

    if (customerPoints === 0) {
      return `¡Hola ${context.customer.name}! 🎯 Actualmente tienes 0 puntos. Puedes ganar puntos con cada compra que realices. ¡Comienza a acumular puntos pidiendo algo delicioso de nuestro menú! 🍽️`;
    }

    try {
      // Get available rewards that customer can afford
      const availableRewards = await sql(`
        SELECT id, name, description, points_required, is_active
        FROM redeemable_products 
        WHERE user_id = $1 
        AND is_active = true 
        AND points_required <= $2
        ORDER BY points_required ASC
      `, [userId, customerPoints]);

      let response = `¡Hola ${context.customer.name}! 🎯 Tienes **${customerPoints} puntos** acumulados.\n\n`;

      if (availableRewards.length > 0) {
        response += `🎁 **Recompensas que puedes canjear:**\n\n`;
        availableRewards.forEach((reward: any) => {
          response += `⭐ **${reward.name}** - ${reward.points_required} puntos\n`;
          if (reward.description) {
            response += `   ${reward.description}\n`;
          }
          response += `\n`;
        });
        response += `¿Te gustaría canjear alguna de estas recompensas? Solo dime "quiero canjear [nombre]" y te ayudo. 😊`;
      } else {
        // Get next available reward
        const nextReward = await sql(`
          SELECT name, points_required 
          FROM redeemable_products 
          WHERE user_id = $1 
          AND is_active = true 
          AND points_required > $2
          ORDER BY points_required ASC
          LIMIT 1
        `, [userId, customerPoints]);

        if (nextReward.length > 0) {
          const pointsNeeded = nextReward[0].points_required - customerPoints;
          response += `Necesitas ${pointsNeeded} puntos más para canjear **${nextReward[0].name}**. ¡Sigue acumulando puntos con tus compras! 🎯`;
        } else {
          response += `¡Sigue acumulando puntos con tus compras para desbloquear increíbles recompensas! 🎯`;
        }
      }

      return response;
    } catch (error) {
      console.error('Error getting rewards:', error);
      return `¡Hola ${context.customer.name}! 🎯 Tienes **${customerPoints} puntos** acumulados. Para ver las recompensas disponibles, por favor contacta al restaurante. 😊`;
    }
  }

  private async handleRewardRedemption(
    message: string,
    state: ConversationState,
    context: ChatbotContext,
    userId: number
  ): Promise<string> {
    if (!context.customer) {
      return '🔍 Para canjear recompensas, necesito que te identifiques primero.';
    }

    const customerPoints = context.customer.points || 0;
    const text = message.toLowerCase();

    try {
      // Extract reward name from message
      const rewardName = this.extractRewardNameFromMessage(text);
      
      if (!rewardName) {
        return 'No pude identificar qué recompensa quieres canjear. ¿Podrías ser más específico? Por ejemplo: "quiero canjear descuento 10%"';
      }

      // Find the reward
      const rewards = await sql(`
        SELECT id, name, description, points_required, is_active
        FROM redeemable_products 
        WHERE user_id = $1 
        AND is_active = true 
        AND LOWER(name) LIKE $2
        ORDER BY points_required ASC
        LIMIT 1
      `, [userId, `%${rewardName}%`]);

      if (rewards.length === 0) {
        return `No encontré la recompensa "${rewardName}". ¿Puedes consultar tus puntos para ver las recompensas disponibles?`;
      }

      const reward = rewards[0];

      if (customerPoints < reward.points_required) {
        const pointsNeeded = reward.points_required - customerPoints;
        return `Lo siento, necesitas ${pointsNeeded} puntos más para canjear **${reward.name}**. Actualmente tienes ${customerPoints} puntos. 🎯`;
      }

      // Store redemption info in state for confirmation
      state.rewardRedemption = {
        reward_id: reward.id,
        reward_name: reward.name,
        points_required: reward.points_required
      };
      state.awaitingConfirmation = 'reward_redemption';

      return `🎁 ¡Perfecto! Quieres canjear **${reward.name}** por ${reward.points_required} puntos.\n\n` +
             `Después del canje te quedarán ${customerPoints - reward.points_required} puntos.\n\n` +
             `¿Confirmas el canje? Responde "sí" para proceder o "no" para cancelar. ✨`;

    } catch (error) {
      console.error('Error handling reward redemption:', error);
      return 'Hubo un problema procesando tu solicitud de canje. ¿Puedes intentar de nuevo?';
    }
  }

  private extractRewardNameFromMessage(text: string): string | null {
    // Remove common words to get the reward name
    const cleanText = text
      .replace(/quiero|deseo|canjear|por|favor|porfa/g, '')
      .trim();
    
    // Return the cleaned text if it has meaningful content
    return cleanText.length > 2 ? cleanText : null;
  }

  private async processRewardRedemption(
    state: ConversationState,
    context: ChatbotContext,
    userId: number
  ): Promise<{ success: boolean; response: string }> {
    if (!state.rewardRedemption || !context.customer) {
      return {
        success: false,
        response: 'No hay una solicitud de canje pendiente.'
      };
    }

    const { reward_id, reward_name, points_required } = state.rewardRedemption;
    const customerId = context.customer.id;

    try {
      // Start transaction to deduct points and log redemption
      await sql(`BEGIN`);

      // Deduct points from customer
      const updateResult = await sql(`
        UPDATE customers 
        SET points = points - $1 
        WHERE id = $2 AND points >= $1
        RETURNING points
      `, [points_required, customerId]);

      if (updateResult.length === 0) {
        await sql(`ROLLBACK`);
        return {
          success: false,
          response: 'No tienes suficientes puntos para este canje. Por favor verifica tu saldo de puntos.'
        };
      }

      // Log the redemption (if you have a redemptions log table)
      await sql(`
        INSERT INTO customer_redemptions (customer_id, reward_id, points_used, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `, [customerId, reward_id, points_required]);

      await sql(`COMMIT`);

      const remainingPoints = updateResult[0].points;

      return {
        success: true,
        response: `🎉 ¡Canje exitoso! Has canjeado **${reward_name}** por ${points_required} puntos.\n\n` +
                 `Te quedan ${remainingPoints} puntos disponibles.\n\n` +
                 `¡Disfruta tu recompensa! Presenta este mensaje al personal del restaurante. ✨`
      };

    } catch (error) {
      await sql(`ROLLBACK`);
      console.error('Error processing reward redemption:', error);
      return {
        success: false,
        response: 'Hubo un problema procesando tu canje. Por favor contacta al restaurante directamente.'
      };
    }
  }

  private async handleOrderDetails(
    message: string,
    state: ConversationState,
    context: ChatbotContext,
    userId: number
  ): Promise<{
    response: string;
    actions?: any[];
    state?: Partial<ConversationState>;
  }> {
    const text = message.toLowerCase().trim();
    
    if (!state.orderInProgress) {
      return {
        response: 'Hubo un error con tu orden. ¿Puedes intentar de nuevo?',
        state: { awaitingConfirmation: undefined }
      };
    }

    // Check if they want to add details or skip
    if (text === 'no' || text === 'sin detalles' || text === 'nada') {
      // No details, proceed to confirmation
      state.orderInProgress.notes = undefined;
    } else {
      // Add the details to the order
      state.orderInProgress.notes = message.trim();
    }

    const orderSummary = this.generateOrderSummary(state.orderInProgress);
    const detailsText = state.orderInProgress.notes 
      ? `\n📝 **Detalles:** ${state.orderInProgress.notes}\n`
      : '';

    const total = typeof state.orderInProgress.total === 'number' ? state.orderInProgress.total : parseFloat(state.orderInProgress.total) || 0;

    return {
      response: `${orderSummary}${detailsText}\n💰 **Total: ${total.toFixed(2)}**\n\n¿Confirmas tu orden? Responde "sí" para confirmar. 🛒`,
      state: { 
        orderInProgress: state.orderInProgress, 
        awaitingConfirmation: 'order' as const,
        lastInteractionType: 'order_confirmation'
      }
    };
  }

  private async handleCustomerRegistration(
    message: string,
    state: ConversationState,
    context: ChatbotContext,
    userId: number
  ): Promise<{
    response: string;
    actions?: any[];
    state?: Partial<ConversationState>;
  }> {
    if (!state.customerRegistration) {
      return {
        response: 'Hubo un error con el registro. ¿Puedes intentar de nuevo?',
        state: { awaitingConfirmation: undefined }
      };
    }

    const registration = state.customerRegistration;
    const text = message.trim();

    switch (registration.step) {
      case 'asking_name':
        // Extract first name only
        const firstName = text.trim();
        
        if (firstName.length < 2) {
          return {
            response: 'Por favor ingresa tu nombre. Por ejemplo: "Juan"',
            state: { customerRegistration: registration }
          };
        }

        // Ask for phone number next
        return {
          response: 'Perfecto! Ahora necesito tu número de teléfono:',
          state: {
            customerRegistration: {
              ...registration,
              step: 'asking_phone',
              first_name: firstName
            }
          }
        };

      case 'asking_phone':
        const phoneNumber = text.trim();
        
        if (phoneNumber.length < 8) {
          return {
            response: 'Por favor ingresa un número de teléfono válido:',
            state: { customerRegistration: registration }
          };
        }

        // Check if customer already exists with this phone
        const existingCustomer = await this.findCustomerByPhone(userId, phoneNumber);
        
        if (existingCustomer) {
          // Customer found by phone, associate them
          const updatedState: any = {
            customerRegistration: undefined,
            awaitingConfirmation: undefined
          };

          if (registration.purpose === 'order' && state.orderInProgress) {
            state.orderInProgress.customer_name = existingCustomer.name;
            state.orderInProgress.customer_id = existingCustomer.id;
            updatedState.orderInProgress = state.orderInProgress;
            updatedState.awaitingConfirmation = 'order';

            const orderSummary = this.generateOrderSummary(state.orderInProgress);
            return {
              response: `¡Hola ${existingCustomer.name}! Te reconocí por tu número. 😊\n\n${orderSummary}\n\n¿Confirmas tu orden por $${state.orderInProgress.total.toFixed(2)}? Responde "sí" para confirmar. 🛒`,
              state: updatedState
            };
          } else if (registration.purpose === 'reservation' && state.reservationInProgress) {
            state.reservationInProgress.customer_name = existingCustomer.name;
            state.reservationInProgress.customer_phone = existingCustomer.phone;
            state.reservationInProgress.customer_email = existingCustomer.email;
            state.reservationInProgress.customer_id = existingCustomer.id;
            updatedState.reservationInProgress = state.reservationInProgress;

            // Continue with reservation flow
            const missing = this.getMissingReservationInfo(state.reservationInProgress);
            if (missing.length > 0) {
              const prompts = {
                date: '¿Para qué fecha quieres la reserva? (por ejemplo: 2024-01-15)',
                time: '¿A qué hora prefieres? (por ejemplo: 19:30)',
                party_size: '¿Para cuántas personas?'
              };
              const missingField = missing[0];
              return {
                response: `¡Hola ${existingCustomer.name}! Te reconocí por tu número. 😊\n\nPara completar tu reserva necesito saber: ${prompts[missingField as keyof typeof prompts]}`,
                state: updatedState
              };
            }
            
            // If no missing info, return success
            return {
              response: `¡Hola ${existingCustomer.name}! Te reconocí por tu número. 😊 Tu reserva está lista para confirmar.`,
              state: updatedState
            };
          }
          
          // If we found a customer but couldn't handle the flow, return success anyway
          return {
            response: `¡Hola ${existingCustomer.name}! Te reconocí por tu número. 😊`,
            state: updatedState
          };
        }

        // New customer - create with name and phone
        const newCustomer = await this.createNewCustomer(
          userId,
          registration.first_name || 'Cliente',
          phoneNumber
        );

        if (!newCustomer) {
          return {
            response: 'Hubo un problema registrando tus datos. ¿Puedes intentar de nuevo?',
            state: { awaitingConfirmation: undefined, customerRegistration: undefined }
          };
        }

        // Update state with new customer info
        const finalState: any = {
          customerRegistration: undefined,
          awaitingConfirmation: undefined
        };

        if (registration.purpose === 'order' && state.orderInProgress) {
          state.orderInProgress.customer_name = newCustomer.name;
          state.orderInProgress.customer_id = newCustomer.id;
          finalState.orderInProgress = state.orderInProgress;
          finalState.awaitingConfirmation = 'order';

          const orderSummary = this.generateOrderSummary(state.orderInProgress);
          return {
            response: `¡Perfecto ${newCustomer.name}! Te he registrado en el sistema. 🎉\n\n${orderSummary}\n\n¿Confirmas tu orden por $${state.orderInProgress.total.toFixed(2)}? Responde "sí" para confirmar. 🛒`,
            state: finalState
          };
        } else if (registration.purpose === 'reservation' && state.reservationInProgress) {
          state.reservationInProgress.customer_name = newCustomer.name;
          state.reservationInProgress.customer_phone = newCustomer.phone;
          state.reservationInProgress.customer_email = newCustomer.email;
          state.reservationInProgress.customer_id = newCustomer.id;
          finalState.reservationInProgress = state.reservationInProgress;

          // Continue with reservation flow
          const missing = this.getMissingReservationInfo(state.reservationInProgress);
          if (missing.length > 0) {
            const prompts = {
              date: '¿Para qué fecha quieres la reserva? (por ejemplo: 2024-01-15)',
              time: '¿A qué hora prefieres? (por ejemplo: 19:30)',
              party_size: '¿Para cuántas personas?'
            };
            const missingField = missing[0];
            return {
              response: `¡Perfecto ${newCustomer.name}! Te he registrado en el sistema. 🎉\n\nPara completar tu reserva necesito saber: ${prompts[missingField as keyof typeof prompts]}`,
              state: finalState
            };
          }
        }

        return {
          response: `¡Perfecto ${newCustomer.name}! Te he registrado en el sistema. ¿En qué más puedo ayudarte? 😊`,
          state: finalState
        };


      default:
        return {
          response: 'Hubo un error en el proceso de registro. ¿Puedes intentar de nuevo?',
          state: { awaitingConfirmation: undefined, customerRegistration: undefined }
        };
    }
  }

  private async findCustomerByPhone(userId: number, phone: string): Promise<any> {
    try {
      if (!phone) return null;
      
      // Handle different phone formats
      let searchPhones = [phone];
      
      // If it's a test phone (starts with 'test-'), search as-is
      if (phone.startsWith('test-')) {
        searchPhones = [phone];
      } else {
        // Clean phone number for searching real phones
        const cleanPhone = phone.replace(/[^\d]/g, '');
        if (cleanPhone.length < 8) return null; // Too short to be a valid phone
        
        searchPhones = [
          phone,
          cleanPhone,
          `%${cleanPhone}%`,
          `%${cleanPhone.slice(-10)}%` // Last 10 digits
        ];
      }
      
      const result = await sql(`
        SELECT id, name, phone, email, points
        FROM customers 
        WHERE user_id = $1 
        AND (
          phone = $2 
          OR phone = $3
          OR phone LIKE $4
          OR phone LIKE $5
        )
        LIMIT 1
      `, [
        userId,
        ...searchPhones
      ]);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error finding customer by phone:', error);
      return null;
    }
  }


  private async createNewCustomer(userId: number, name: string, phone: string, email?: string): Promise<any> {
    try {
      const result = await sql(`
        INSERT INTO customers (user_id, name, phone, email, points, created_at)
        VALUES ($1, $2, $3, $4, 0, NOW())
        RETURNING id, name, phone, email, points
      `, [userId, name, phone, email || null]);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error creating new customer:', error);
      return null;
    }
  }

  private async generateGeneralResponse(
    message: string,
    context: ChatbotContext,
    state: ConversationState,
    customerPhone?: string,
    userId?: number
  ): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context, state);
      
      // Get conversation history for context
      let conversationHistory = '';
      if (customerPhone && userId) {
        const memoryKey = `${userId}-${customerPhone}`;
        const recentMessages = this.conversationMemory.get(memoryKey) || [];
        if (recentMessages.length > 0) {
          conversationHistory = '\n\n**Conversación reciente:**\n' + recentMessages.slice(-6).join('\n') + '\n';
        }
      }
      
      const userMessage = `Cliente: ${message}`;

      const result = await this.model.generateContent(`${systemPrompt}${conversationHistory}\n\n${userMessage}\n\nAsistente:`);
      const response = await result.response;
      
      return response.text() || 'Lo siento, no pude procesar tu mensaje. ¿Puedes intentar de nuevo?';
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'Lo siento, hubo un problema procesando tu mensaje. ¿Puedes intentar de nuevo?';
    }
  }

  private buildSystemPrompt(context: ChatbotContext, state: ConversationState): string {
    let prompt = `Eres ${context.botConfig?.bot_name || 'un asistente virtual'} para el restaurante ${context.businessInfo?.business_name}.\n\n`;
    
    prompt += `**Tu personalidad:** ${context.botConfig?.ai_role || 'Amigable y servicial'}\n\n`;
    
    if (context.botConfig?.ai_instructions) {
      prompt += `**Instrucciones especiales:** ${context.botConfig.ai_instructions}\n\n`;
    }

    prompt += `**Información del restaurante:**\n`;
    if (context.businessInfo?.description) {
      prompt += `- Descripción: ${context.businessInfo.description}\n`;
    }
    if (context.businessInfo?.address) {
      prompt += `- Dirección: ${context.businessInfo.address}\n`;
    }
    if (context.businessInfo?.phone) {
      prompt += `- Teléfono: ${context.businessInfo.phone}\n`;
    }

    if (context.customer) {
      prompt += `\n**Cliente:** ${context.customer.name} (${context.customer.points} puntos acumulados)\n`;
    }

    // Add points redemption information
    if (context.customer?.points && context.customer.points > 0) {
      prompt += `\n**Puntos del cliente:** ${context.customer.points} puntos disponibles para canjear`;
      
      // Get available rewards
      prompt += `\n**Recompensas disponibles:** Pregunta por productos que pueda canjear con sus puntos.`;
    }

    // Add available products information
    if (context.products && context.products.length > 0) {
      const availableProducts = context.products.filter(p => p.is_available);
      if (availableProducts.length > 0) {
        prompt += `\n\n**Productos disponibles en el menú:**`;
        const productsByCategory: { [key: string]: any[] } = {};
        
        availableProducts.forEach(product => {
          const category = product.category_name || 'Otros';
          if (!productsByCategory[category]) {
            productsByCategory[category] = [];
          }
          productsByCategory[category].push(product);
        });

        Object.entries(productsByCategory).forEach(([category, products]) => {
          prompt += `\n\n**${category}:**`;
          products.slice(0, 5).forEach(product => { // Limit to 5 per category to avoid prompt bloat
            const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
            prompt += `\n- ${product.name}: $${price.toFixed(2)}`;
          });
        });
        
        prompt += `\n\n**IMPORTANTE:** Cuando un cliente pida algo, busca primero en estos productos disponibles y sugiere alternativas similares si no encuentras exactamente lo que pide.`;
      }
    }

    prompt += `\n**Instrucciones:**
- Responde de manera concisa y amigable
- Usa emojis apropiados
- SIEMPRE trata de ayudar con pedidos. NO derives al teléfono a menos que sea absolutamente necesario
- Si el cliente quiere hacer un pedido, sugiere productos similares disponibles
- Si mencionan un producto que no tienes exactamente, busca opciones similares en el menú
- Si quiere hacer una reserva, pregunta fecha, hora y número de personas
- Para el menú, horarios o ubicación, proporciona la información disponible
- Si el cliente menciona puntos o recompensas, explica cómo puede usarlos
- Si tiene puntos suficientes, ofrece productos que puede canjear
- Mantén un tono profesional pero cálido y SIEMPRE útil
- No inventes información que no tienes disponible
- NUNCA sugieras contactar al restaurante por teléfono para pedidos - tu trabajo es tomar pedidos`;

    return prompt;
  }

  // Conversation Memory Methods
  
  private async loadConversationMemory(userId: number, customerPhone: string): Promise<void> {
    try {
      const memoryKey = `${userId}-${customerPhone}`;
      
      // Load from database
      const result = await sql(`
        SELECT conversation_data, last_message 
        FROM conversation_memory 
        WHERE user_id = $1 AND customer_phone = $2
        ORDER BY last_interaction DESC
        LIMIT 1
      `, [userId, customerPhone]);

      if (result.length > 0 && result[0].conversation_data) {
        const messages = result[0].conversation_data.messages || [];
        this.conversationMemory.set(memoryKey, messages);
      } else {
        this.conversationMemory.set(memoryKey, []);
      }
    } catch (error) {
      console.error('Error loading conversation memory:', error);
      this.conversationMemory.set(`${userId}-${customerPhone}`, []);
    }
  }

  private async addMessageToMemory(userId: number, customerPhone: string, message: string, isBot: boolean): Promise<void> {
    try {
      const memoryKey = `${userId}-${customerPhone}`;
      const messages = this.conversationMemory.get(memoryKey) || [];
      
      const formattedMessage = isBot ? `Bot: ${message}` : `Cliente: ${message}`;
      messages.push(formattedMessage);
      
      // Keep only last 20 messages to avoid memory bloat
      if (messages.length > 20) {
        messages.splice(0, messages.length - 20);
      }
      
      this.conversationMemory.set(memoryKey, messages);
    } catch (error) {
      console.error('Error adding message to memory:', error);
    }
  }

  private async saveConversationMemory(userId: number, customerPhone: string, state: ConversationState): Promise<void> {
    try {
      const memoryKey = `${userId}-${customerPhone}`;
      const messages = this.conversationMemory.get(memoryKey) || [];
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : '';

      await sql(`
        INSERT INTO conversation_memory (user_id, customer_phone, conversation_data, last_message, last_interaction)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, customer_phone) 
        DO UPDATE SET 
          conversation_data = $3,
          last_message = $4,
          last_interaction = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [
        userId, 
        customerPhone, 
        JSON.stringify({ messages, state }), 
        lastMessage
      ]);
    } catch (error) {
      console.error('Error saving conversation memory:', error);
    }
  }

  // Helper methods

  private findSimilarProducts(text: string, products: any[]): any[] {
    const keywords = text.split(' ').filter(word => word.length > 2);
    const similarProducts: Array<{product: any, score: number}> = [];
    
    products.forEach(product => {
      const productName = product.name.toLowerCase();
      const productWords = productName.split(' ');
      let score = 0;
      
      // Check for keyword matches
      keywords.forEach(keyword => {
        if (productName.includes(keyword)) {
          score += 10; // High score for direct matches
        }
        productWords.forEach(productWord => {
          if (productWord.includes(keyword) || keyword.includes(productWord)) {
            score += 5; // Medium score for partial matches
          }
        });
      });
      
      // Bonus for common food terms
      const foodMatches = [
        ['lomo', ['lomo', 'carne', 'entrañ']],
        ['hamburguesa', ['hamburgues', 'burger']],
        ['pizza', ['pizza']],
        ['pollo', ['pollo', 'chicken']],
        ['completo', ['completo', 'sandwich', 'hot dog']],
        ['papas', ['papa', 'frita']],
        ['bebida', ['bebida', 'gaseosa', 'agua', 'jugo']]
      ];
      
      foodMatches.forEach(([searchTerm, matchTerms]) => {
        if (text.includes(searchTerm as string)) {
          (matchTerms as string[]).forEach(matchTerm => {
            if (productName.includes(matchTerm)) {
              score += 15; // High bonus for food category matches
            }
          });
        }
      });
      
      if (score > 0) {
        similarProducts.push({ product, score });
      }
    });
    
    // Sort by score and return top matches
    return similarProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.product);
  }

  private async extractProductsFromMessage(message: string, products: any[]): Promise<any[]> {
    const foundProducts: any[] = [];
    const text = message.toLowerCase();

    // Filter only available products
    const availableProducts = products.filter(product => product.is_available === true);
    
    if (availableProducts.length === 0) {
      console.log('No available products found in database');
      return [];
    }

    // Find the best match instead of all matches
    let bestMatch: any = null;
    let bestMatchScore = 0;

    availableProducts.forEach(product => {
      const productName = product.name.toLowerCase();
      
      // Check for exact matches first (highest priority)
      if (text.includes(productName)) {
        const score = productName.length; // Longer matches are better
        if (score > bestMatchScore) {
          bestMatch = product;
          bestMatchScore = score;
        }
      }
      // Then check for partial matches (lower priority)
      else {
        const searchTerms = [
          productName.split(' ')[0], // First word
          productName.replace(/[^a-z0-9]/g, '') // Remove special chars
        ];

        for (const term of searchTerms) {
          if (term.length > 2 && text.includes(term)) {
            const score = term.length * 0.5; // Partial matches get lower score
            if (score > bestMatchScore) {
              bestMatch = product;
              bestMatchScore = score;
            }
          }
        }
      }
    });

    // If we found a match, add it with quantity
    if (bestMatch) {
      const productName = bestMatch.name.toLowerCase();
      
      // Try to extract quantity - be more specific to avoid false positives
      const quantityPatterns = [
        new RegExp(`(\\d+)\\s*(?:de\\s+)?(?:del\\s+)?(?:un\\s+)?${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
        new RegExp(`${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:x|por)\\s*(\\d+)`, 'i'),
        new RegExp(`(\\d+)\\s*${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
      ];
      
      let quantity = 1; // Default quantity
      
      for (const pattern of quantityPatterns) {
        const quantityMatch = text.match(pattern);
        if (quantityMatch) {
          const extractedQuantity = parseInt(quantityMatch[1]);
          if (extractedQuantity > 0 && extractedQuantity <= 20) { // Reasonable limit
            quantity = extractedQuantity;
            break;
          }
        }
      }

      // Check for explicit "solo uno" or "solo un" mentions
      if (text.includes('solo un') || text.includes('solo uno') || text.includes('un solo') || text.includes('una sola')) {
        quantity = 1;
      }

      foundProducts.push({
        ...bestMatch,
        quantity,
        available: bestMatch.is_available
      });
    }

    return foundProducts;
  }

  private async validateProductAvailability(userId: number, productIds: number[]): Promise<{available: any[], unavailable: any[]}> {
    if (productIds.length === 0) return { available: [], unavailable: [] };

    try {
      const products = await sql(`
        SELECT id, name, price, is_available, category_id
        FROM products 
        WHERE user_id = $1 AND id = ANY($2)
      `, [userId, productIds]);

      const available = products.filter(p => p.is_available === true);
      const unavailable = products.filter(p => p.is_available === false);

      return { available, unavailable };
    } catch (error) {
      console.error('Error validating product availability:', error);
      return { available: [], unavailable: [] };
    }
  }

  private async extractReservationData(message: string, context: ChatbotContext): Promise<Partial<ConversationState['reservationInProgress']>> {
    const data: any = {};
    const text = message.toLowerCase();
    console.log('Extracting reservation data from:', text); // Debug log

    // Extract date (various formats)
    const datePatterns = [
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{1,2})\s+de\s+(\w+)/,
      /para\s+(hoy|mañana|pasado\s+mañana)/,         // para hoy, para mañana
      /(hoy|mañana|pasado\s+mañana)/
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateWord = match[1] || match[0];
        
        if (dateWord === 'hoy' || dateWord.includes('hoy')) {
          data.date = new Date().toISOString().split('T')[0];
        } else if (dateWord === 'mañana' || dateWord.includes('mañana')) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          data.date = tomorrow.toISOString().split('T')[0];
        } else if (dateWord === 'pasado mañana' || dateWord.includes('pasado mañana')) {
          const dayAfter = new Date();
          dayAfter.setDate(dayAfter.getDate() + 2);
          data.date = dayAfter.toISOString().split('T')[0];
        } else if (dateWord && dateWord.includes('-')) {
          data.date = dateWord;
        }
        break;
      }
    }

    // Extract time - improved patterns
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm|hrs?)?/i,         // 19:30, 7:30pm
      /(\d{1,2})\s*:?\s*(\d{2})\s*(am|pm|hrs?)/i,   // 19 30, 7 30 pm
      /(\d{1,2})\s*(am|pm|hrs?|h)\s*(\d{2})?/i,     // 21hs, 7pm, 19h30
      /a\s+las?\s+(\d{1,2}):?(\d{2})?/i,            // a las 21, a la 19:30
      /(\d{1,2})\s*(?:horas?|hs?)\s*(\d{2})?/i      // 21 horas, 21hs 30
    ];

    let timeMatch = null;
    for (const pattern of timePatterns) {
      timeMatch = text.match(pattern);
      if (timeMatch) break;
    }

    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      let minute = 0;
      
      // Handle different pattern matches
      if (timeMatch[2] && /\d{2}/.test(timeMatch[2])) {
        minute = parseInt(timeMatch[2]);
      } else if (timeMatch[3] && /\d{2}/.test(timeMatch[3])) {
        minute = parseInt(timeMatch[3]);
      }
      
      const ampm = timeMatch[2] || timeMatch[3];

      // Handle AM/PM conversion
      if (ampm && typeof ampm === 'string') {
        if (ampm.toLowerCase().includes('pm') && hour < 12) {
          hour += 12;
        } else if (ampm.toLowerCase().includes('am') && hour === 12) {
          hour = 0;
        }
      }

      // Validate hour range
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        data.time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
    }

    // Extract party size
    const partySizePatterns = [
      /para\s+(\d+)\s+personas?/,
      /(\d+)\s+personas?/,
      /mesa\s+para\s+(\d+)/,
      /somos\s+(\d+)/
    ];

    for (const pattern of partySizePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.party_size = parseInt(match[1]);
        break;
      }
    }

    console.log('Extracted reservation data:', data); // Debug log
    return data;
  }

  private getMissingReservationInfo(reservation: any): string[] {
    const missing: string[] = [];
    
    if (!reservation.date) missing.push('date');
    if (!reservation.time) missing.push('time');
    if (!reservation.party_size) missing.push('party_size');
    if (!reservation.customer_name) missing.push('customer_name');

    return missing;
  }

  private generateOrderSummary(order: ConversationState['orderInProgress']): string {
    if (!order) return '';

    let summary = '🛒 **Tu Orden:**\n';
    order.items.forEach(item => {
      const price = typeof item.total_price === 'number' ? item.total_price : parseFloat(item.total_price) || 0;
      summary += `• ${item.quantity}x ${item.product_name} - ${price.toFixed(2)}\n`;
    });
    const total = typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0;
    summary += `\n💰 **Total: ${total.toFixed(2)}**`;

    return summary;
  }

  private async createOrderFromState(order: ConversationState['orderInProgress'], userId: number, customer?: any) {
    try {
      // Prepare notes based on whether customer added details
      let notes = 'Orden creada por chatbot';
      if (order!.notes && order!.notes.trim()) {
        notes = `Chatbot - ${order!.notes}`;
      }

      // Create order in database - using same format as other orders
      const result = await sql(`
        INSERT INTO orders (user_id, customer_id, customer_name, total, status, notes, payment_method_name, created_at)
        VALUES ($1, $2, $3, $4, 'pendiente', $5, 'Por definir', NOW())
        RETURNING id
      `, [
        userId,
        order!.customer_id || customer?.id || null,
        order!.customer_name || 'Cliente',
        order!.total,
        notes
      ]);

      const orderId = result[0].id;
      console.log('Created chatbot order with ID:', orderId); // Debug log

      // Add order items
      for (const item of order!.items) {
        await sql(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          orderId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.total_price
        ]);
      }

      return { success: true, orderId };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: error };
    }
  }

  private cleanupOldStates() {
    // Remove states older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [key, state] of this.conversationStates.entries()) {
      // This is a simple cleanup - in production you might want to store timestamps
      if (Math.random() > 0.99) { // Randomly cleanup with 1% probability
        this.conversationStates.delete(key);
      }
    }
  }
}