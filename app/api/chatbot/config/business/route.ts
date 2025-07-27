import { NextRequest, NextResponse } from 'next/server'
import { getBusinessInfo, updateBusinessInfo } from '@/app/actions/chatbot'

export async function POST(request: NextRequest) {
  try {
    const { action, userId, data } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    switch (action) {
      case 'get':
        const businessInfo = await getBusinessInfo(userId)
        return NextResponse.json(businessInfo)

      case 'update':
        if (!data) {
          return NextResponse.json({ error: 'Data is required' }, { status: 400 })
        }
        
        const updateResult = await updateBusinessInfo(userId, {
          businessName: data.business_name,
          businessType: data.business_type,
          description: data.description,
          address: data.address,
          phone: data.phone,
          email: data.email,
          website: data.website,
          openingHours: data.opening_hours,
          specialOffers: data.special_offers,
          paymentMethods: data.payment_methods,
          deliveryInfo: data.delivery_info
        })
        
        if (updateResult.success) {
          return NextResponse.json(updateResult.info)
        } else {
          return NextResponse.json({ error: updateResult.error }, { status: 400 })
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Business config API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
