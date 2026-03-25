import { NextRequest, NextResponse } from 'next/server'
import { db, sqlClient } from '@/db'
import { settings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/auth'
import { isPasswordStrongEnough } from '@/lib/password-strength'

/**
 * Create settings table if it doesn't exist
 */
async function ensureSettingsTableExists(): Promise<boolean> {
  try {
    // Try to select from settings - if it fails, table doesn't exist
    await db.select().from(settings).limit(1)
    return true
  } catch (error: any) {
    // If table doesn't exist, create it
    const errorMsg = error.message || ''
    if (errorMsg.includes('relation') || errorMsg.includes('does not exist') || errorMsg.includes('"settings"')) {
      console.log('[SETUP] Creating settings table...')
      
      await sqlClient`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          website_name TEXT DEFAULT 'Krishi Bitan',
          slogan TEXT,
          logo_url TEXT,
          favicon_url TEXT,
          hero_images TEXT,
          inside_dhaka_delivery NUMERIC(10,2) DEFAULT '60',
          outside_dhaka_delivery NUMERIC(10,2) DEFAULT '120',
          free_delivery_min NUMERIC(10,2) DEFAULT '500',
          universal_delivery BOOLEAN DEFAULT false,
          universal_delivery_charge NUMERIC(10,2) DEFAULT '60',
          whatsapp_number TEXT,
          phone_number TEXT,
          facebook_url TEXT,
          messenger_username TEXT,
          about_us TEXT,
          terms_conditions TEXT,
          refund_policy TEXT,
          privacy_policy TEXT,
          offer_title TEXT DEFAULT 'Offers',
          offer_slogan TEXT DEFAULT 'Exclusive deals just for you',
          first_section_name TEXT DEFAULT 'Categories',
          first_section_slogan TEXT DEFAULT 'Browse by category',
          second_section_name TEXT DEFAULT 'Offers',
          second_section_slogan TEXT DEFAULT 'Exclusive deals for you',
          third_section_name TEXT DEFAULT 'Featured',
          third_section_slogan TEXT DEFAULT 'Handpicked products',
          hero_animation_speed INTEGER DEFAULT 3000,
          hero_animation_type TEXT DEFAULT 'Fade',
          stock_low_percent INTEGER DEFAULT 25,
          stock_medium_percent INTEGER DEFAULT 50,
          courier_enabled BOOLEAN DEFAULT false,
          courier_api_key TEXT,
          courier_secret_key TEXT,
          admin_username TEXT DEFAULT 'admin',
          admin_password TEXT,
          steadfast_api_key TEXT,
          steadfast_secret_key TEXT,
          steadfast_webhook_url TEXT,
          cloudinary_cloud_name TEXT,
          cloudinary_api_key TEXT,
          cloudinary_api_secret TEXT,
          admin_username_updated_at TEXT,
          admin_password_updated_at TEXT,
          steadfast_api_updated_at TEXT,
          cloudinary_updated_at TEXT
        )
      `
      
      console.log('[SETUP] Settings table created successfully')
      return true
    }
    
    console.error('[SETUP] Error checking/creating settings table:', error)
    throw error
  }
}

/**
 * GET /api/setup
 * Check if setup is needed (no admin configured)
 */
export async function GET() {
  try {
    // Ensure table exists
    await ensureSettingsTableExists()
    
    const result = await db.select().from(settings).where(eq(settings.id, 1)).limit(1)

    if (result.length === 0 || !result[0].adminPassword) {
      return NextResponse.json({
        needsSetup: true,
        message: 'Admin credentials not configured'
      })
    }

    return NextResponse.json({
      needsSetup: false,
      message: 'Admin already configured'
    })
  } catch (error) {
    console.error('Setup check error:', error)
    return NextResponse.json({
      needsSetup: true,
      message: 'Could not verify setup status',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/setup
 * Create initial admin credentials (only if not already configured)
 */
export async function POST(request: NextRequest) {
  try {
    // Ensure table exists
    await ensureSettingsTableExists()
    
    // Check if already configured
    const existing = await db.select().from(settings).where(eq(settings.id, 1)).limit(1)

    if (existing.length > 0 && existing[0].adminPassword) {
      return NextResponse.json({
        success: false,
        error: 'Admin already configured. Use login page.'
      }, { status: 400 })
    }

    const body = await request.json()
    const { username, password, confirmPassword } = body

    // Validate inputs
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Username and password are required'
      }, { status: 400 })
    }

    if (username.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Username must be at least 3 characters'
      }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({
        success: false,
        error: 'Passwords do not match'
      }, { status: 400 })
    }

    // Check password strength
    const strengthCheck = isPasswordStrongEnough(password)
    if (!strengthCheck.valid) {
      return NextResponse.json({
        success: false,
        error: strengthCheck.error || 'Password is too weak'
      }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create or update settings
    if (existing.length === 0) {
      // Create new settings row
      await db.insert(settings).values({
        id: 1,
        websiteName: 'Krishi Bitan',
        slogan: 'Fresh from farm to your table',
        adminUsername: username,
        adminPassword: hashedPassword,
        adminUsernameUpdatedAt: new Date().toISOString(),
        adminPasswordUpdatedAt: new Date().toISOString(),
        insideDhakaDelivery: '60',
        outsideDhakaDelivery: '120',
        freeDeliveryMin: '500',
        universalDelivery: false,
        universalDeliveryCharge: '60',
        heroAnimationSpeed: 3000,
        heroAnimationType: 'Fade',
        stockLowPercent: 25,
        stockMediumPercent: 50,
        courierEnabled: false,
      })
    } else {
      // Update existing settings
      await db.update(settings)
        .set({
          adminUsername: username,
          adminPassword: hashedPassword,
          adminUsernameUpdatedAt: new Date().toISOString(),
          adminPasswordUpdatedAt: new Date().toISOString(),
        })
        .where(eq(settings.id, 1))
    }

    console.log('[SETUP] Admin created successfully:', username)

    return NextResponse.json({
      success: true,
      message: 'Admin credentials created successfully! Please login now.'
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed. Please try again.'
    }, { status: 500 })
  }
}
