import { NextResponse } from 'next/server';
import { WhatsAppBotManager } from '@/lib/whatsapp-bot-manager';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'status') {
      const instance = WhatsAppBotManager.getBotInstance(user.id);
      const status = {
        is_connected: instance?.status === 'connected',
        phone_number: instance?.phoneNumber,
      };
      return NextResponse.json(status);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in WhatsApp API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
