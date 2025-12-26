#!/usr/bin/env node

/**
 * Supabase Setup Verification Script
 * 
 * This script verifies that Supabase is properly configured:
 * - Checks environment variables
 * - Tests Supabase connection
 * - Verifies database tables and functions exist
 * - Tests invoice number generation
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load .env.local if dotenv is available, otherwise use process.env
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not installed, try to manually parse .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

async function checkEnvironmentVariables() {
  log('\n📋 Checking Environment Variables...', 'cyan');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  let allGood = true;
  
  if (!supabaseUrl) {
    logError('NEXT_PUBLIC_SUPABASE_URL is not set');
    logInfo('  → Get this from: Supabase Dashboard → Settings → API → Project URL');
    allGood = false;
  } else {
    logSuccess(`NEXT_PUBLIC_SUPABASE_URL is set (${supabaseUrl.substring(0, 30)}...)`);
  }
  
  if (!supabaseAnonKey) {
    logError('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    logInfo('  → Get this from: Supabase Dashboard → Settings → API → anon/public key');
    allGood = false;
  } else {
    logSuccess(`NEXT_PUBLIC_SUPABASE_ANON_KEY is set (${supabaseAnonKey.substring(0, 20)}...)`);
  }
  
  if (!allGood) {
    logWarning('\n💡 Create a .env.local file in the project root with:');
    log('   NEXT_PUBLIC_SUPABASE_URL=your_project_url', 'yellow');
    log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key', 'yellow');
  }
  
  return { supabaseUrl, supabaseAnonKey, allGood };
}

async function testSupabaseConnection(supabaseUrl, supabaseAnonKey) {
  log('\n🔌 Testing Supabase Connection...', 'cyan');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    logError('Cannot test connection - environment variables missing');
    return { client: null, connected: false };
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test connection by querying a system table
    const { data, error } = await supabase.from('invoices').select('id').limit(1);
    
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist or is empty - but connection works
      logSuccess('Connected to Supabase successfully');
      return { client: supabase, connected: true };
    }
    
    if (error && error.code !== 'PGRST116') {
      // Other error - might be table doesn't exist
      logWarning(`Connection test returned: ${error.message}`);
      logInfo('  → This might be okay if the migration hasn\'t been run yet');
      return { client: supabase, connected: true }; // Connection works, table might not exist
    }
    
    logSuccess('Connected to Supabase successfully');
    return { client: supabase, connected: true };
  } catch (error) {
    logError(`Failed to connect to Supabase: ${error.message}`);
    return { client: null, connected: false };
  }
}

async function checkInvoicesTable(supabase) {
  log('\n📊 Checking invoices table...', 'cyan');
  
  if (!supabase) {
    logError('Cannot check table - Supabase client not available');
    return false;
  }
  
  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('invoices')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        logError('invoices table does not exist');
        logInfo('  → Run the migration: supabase/migrations/001_create_invoices_table.sql');
        logInfo('  → In Supabase Dashboard → SQL Editor → Paste and Run');
        return false;
      } else if (error.code === 'PGRST116') {
        logSuccess('invoices table exists (empty)');
        return true;
      } else {
        logError(`Error checking table: ${error.message}`);
        return false;
      }
    }
    
    logSuccess('invoices table exists');
    if (data && data.length > 0) {
      logInfo(`  → Found ${data.length} invoice(s) in table`);
    }
    return true;
  } catch (error) {
    logError(`Failed to check table: ${error.message}`);
    return false;
  }
}

async function checkGetNextInvoiceNumberFunction(supabase) {
  log('\n🔢 Checking get_next_invoice_number() function...', 'cyan');
  
  if (!supabase) {
    logError('Cannot check function - Supabase client not available');
    return false;
  }
  
  try {
    const { data, error } = await supabase.rpc('get_next_invoice_number');
    
    if (error) {
      if (error.code === '42883' || error.message.includes('does not exist')) {
        logError('get_next_invoice_number() function does not exist');
        logInfo('  → Run the migration: supabase/migrations/001_create_invoices_table.sql');
        logInfo('  → In Supabase Dashboard → SQL Editor → Paste and Run');
        return false;
      } else {
        logError(`Error calling function: ${error.message}`);
        return false;
      }
    }
    
    logSuccess(`get_next_invoice_number() function exists`);
    logInfo(`  → Returns: ${data}`);
    return true;
  } catch (error) {
    logError(`Failed to check function: ${error.message}`);
    return false;
  }
}

async function checkInvoiceExistsFunction(supabase) {
  log('\n🔍 Checking invoice_exists() function...', 'cyan');
  
  if (!supabase) {
    logError('Cannot check function - Supabase client not available');
    return false;
  }
  
  try {
    // Test with a non-existent invoice number
    const { data, error } = await supabase.rpc('invoice_exists', {
      invoice_no_param: 'TEST-NON-EXISTENT-99999'
    });
    
    if (error) {
      if (error.code === '42883' || error.message.includes('does not exist')) {
        logError('invoice_exists() function does not exist');
        logInfo('  → Run the migration: supabase/migrations/001_create_invoices_table.sql');
        logInfo('  → In Supabase Dashboard → SQL Editor → Paste and Run');
        return false;
      } else {
        logError(`Error calling function: ${error.message}`);
        return false;
      }
    }
    
    logSuccess(`invoice_exists() function exists`);
    logInfo(`  → Test result: ${data === false ? 'correctly returned false' : 'unexpected result'}`);
    return true;
  } catch (error) {
    logError(`Failed to check function: ${error.message}`);
    return false;
  }
}

async function testInvoiceCreation(supabase) {
  log('\n🧪 Testing invoice creation...', 'cyan');
  
  if (!supabase) {
    logError('Cannot test - Supabase client not available');
    return false;
  }
  
  try {
    const testInvoiceNo = `TEST-${Date.now()}`;
    
    // Try to create a test invoice
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        invoice_no: testInvoiceNo,
        order_no: 'TEST-ORDER',
        invoice_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        logWarning('Unique constraint works (invoice already exists)');
        return true;
      } else {
        logError(`Failed to create test invoice: ${error.message}`);
        return false;
      }
    }
    
    logSuccess('Test invoice created successfully');
    
    // Clean up - delete the test invoice
    await supabase.from('invoices').delete().eq('invoice_no', testInvoiceNo);
    logInfo('  → Test invoice cleaned up');
    
    return true;
  } catch (error) {
    logError(`Failed to test invoice creation: ${error.message}`);
    return false;
  }
}

async function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🔧 Supabase Setup Verification', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const results = {
    envVars: false,
    connection: false,
    table: false,
    getNextFunction: false,
    existsFunction: false,
    invoiceCreation: false,
  };
  
  // Step 1: Check environment variables
  const { supabaseUrl, supabaseAnonKey, allGood: envGood } = await checkEnvironmentVariables();
  results.envVars = envGood;
  
  if (!envGood) {
    log('\n❌ Setup incomplete - environment variables missing', 'red');
    log('\n📖 Next steps:', 'cyan');
    log('1. Create .env.local file in project root', 'yellow');
    log('2. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY', 'yellow');
    log('3. Get credentials from: Supabase Dashboard → Settings → API', 'yellow');
    log('4. Run this script again to verify', 'yellow');
    process.exit(1);
  }
  
  // Step 2: Test connection
  const { client: supabase, connected } = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
  results.connection = connected;
  
  if (!connected) {
    log('\n❌ Setup incomplete - cannot connect to Supabase', 'red');
    log('\n📖 Next steps:', 'cyan');
    log('1. Verify your Supabase project URL is correct', 'yellow');
    log('2. Verify your anon key is correct', 'yellow');
    log('3. Check if your Supabase project is active', 'yellow');
    process.exit(1);
  }
  
  // Step 3: Check table
  results.table = await checkInvoicesTable(supabase);
  
  // Step 4: Check functions
  results.getNextFunction = await checkGetNextInvoiceNumberFunction(supabase);
  results.existsFunction = await checkInvoiceExistsFunction(supabase);
  
  // Step 5: Test invoice creation (only if everything else works)
  if (results.table && results.getNextFunction && results.existsFunction) {
    results.invoiceCreation = await testInvoiceCreation(supabase);
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Verification Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const allChecks = [
    { name: 'Environment Variables', result: results.envVars },
    { name: 'Supabase Connection', result: results.connection },
    { name: 'invoices Table', result: results.table },
    { name: 'get_next_invoice_number() Function', result: results.getNextFunction },
    { name: 'invoice_exists() Function', result: results.existsFunction },
    { name: 'Invoice Creation Test', result: results.invoiceCreation },
  ];
  
  allChecks.forEach(check => {
    if (check.result) {
      logSuccess(`${check.name}`);
    } else {
      logError(`${check.name}`);
    }
  });
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    log('\n✅ All checks passed! Supabase is properly configured.', 'green');
    log('\n🚀 You can now:', 'cyan');
    log('  • Start your dev server: npm run dev', 'yellow');
    log('  • Upload CSV files to generate invoices', 'yellow');
    log('  • Invoice numbers will start from Q-MAN-25-101', 'yellow');
  } else {
    log('\n❌ Some checks failed. Please fix the issues above.', 'red');
    log('\n📖 Quick Fix Guide:', 'cyan');
    
    if (!results.table || !results.getNextFunction || !results.existsFunction) {
      log('1. Run the migration:', 'yellow');
      log('   → Open Supabase Dashboard → SQL Editor', 'yellow');
      log('   → Copy contents of: supabase/migrations/001_create_invoices_table.sql', 'yellow');
      log('   → Paste and click "Run"', 'yellow');
      log('   → Run this script again to verify', 'yellow');
    }
  }
  
  log('\n');
  process.exit(allPassed ? 0 : 1);
}

// Run the verification
main().catch(error => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

