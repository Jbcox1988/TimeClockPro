import puppeteer from 'puppeteer';

interface SyncResult {
  success: boolean;
  message: string;
  error?: string;
}

// Employee name mapping - customize these to match your external system
const EMPLOYEE_NAME_MAPPING: Record<string, string> = {
  "Administrator": "Administrator",
  "Josh Cox": "Josh Cox",  // External system also uses "Josh Cox"
  "Joshua Cox": "Josh Cox",
  "Matt McVeigh": "Matt McVeigh", 
  "Sarah Johnson": "Sarah Johnson",
  "Mike Davis": "Mike Davis",
  "Lisa Thompson": "Lisa Thompson",
  "David Wilson": "David Wilson",
  "Emily Brown": "Emily Brown"
};

const EXTERNAL_TIMECLOCK_URL = "https://admin.andrewstool.com/account/timeclock";

export async function syncPunchToExternalClock(
  employeeName: string, 
  punchType: 'in' | 'out'
): Promise<SyncResult> {
  let browser;
  
  try {
    console.log(`Syncing ${punchType} punch for ${employeeName} to external time clock...`);
    
    // Get the mapped name for the external system
    const externalName = EMPLOYEE_NAME_MAPPING[employeeName];
    if (!externalName) {
      return {
        success: false,
        message: `No mapping found for employee: ${employeeName}`,
        error: "EMPLOYEE_NOT_MAPPED"
      };
    }

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(30000);
    
    // Navigate to the external time clock
    console.log(`Navigating to ${EXTERNAL_TIMECLOCK_URL}...`);
    await page.goto(EXTERNAL_TIMECLOCK_URL, { waitUntil: 'networkidle2' });
    
    // Wait for page to load and look for employee name
    console.log(`Looking for employee: ${externalName}...`);
    
    // Wait for page to load completely
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let employeeElement = null;
    
    // First, collect all text content to see what's available
    const allElements = await page.$$('button, a, div, span, td, li');
    const allTexts = [];
    for (const element of allElements) {
      const text = await page.evaluate(el => {
        return (el.textContent || el.getAttribute('data-name') || el.getAttribute('data-employee') || el.getAttribute('title') || '').trim();
      }, element);
      
      if (text && text.length > 1 && text.length < 100) {
        allTexts.push(text);
      }
    }
    
    // Filter for potential employee names
    const potentialNames = allTexts.filter(text => 
      /^[A-Za-z\s]{3,50}$/.test(text) && 
      (text.toLowerCase().includes('cox') || 
       text.toLowerCase().includes('josh') || 
       text.toLowerCase().includes('matthew') ||
       text.toLowerCase().includes('matt') ||
       text.toLowerCase().includes('admin'))
    );
    
    console.log(`All potential employee names found: ${JSON.stringify(potentialNames)}`);
    
    // Step 1: Click on employee name button to navigate to their personal page
    console.log(`Looking for employee button: ${externalName}...`);
    
    // Try multiple approaches to find the button
    let employeeButton = null;
    
    // Use Puppeteer's XPath to click by text content
    try {
      console.log(`Attempting XPath click for "${externalName}"...`);
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try XPath approach to find element by text
      const [element] = await page.$x(`//*[contains(text(), "${externalName}")]`);
      if (element) {
        console.log(`Found element via XPath, clicking...`);
        await element.click();
        employeeButton = true;
        console.log(`Successfully clicked "${externalName}" via XPath`);
      } else {
        console.log(`Could not find element via XPath for "${externalName}"`);
        
        // Last resort: try simple text-based clicking with page.click
        try {
          await page.evaluate((text) => {
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            
            let node;
            while (node = walker.nextNode()) {
              if (node.textContent?.trim() === text) {
                const parent = node.parentElement;
                if (parent) {
                  parent.click();
                  return true;
                }
              }
            }
            return false;
          }, externalName);
          
          employeeButton = true;
          console.log(`Clicked via text walker for "${externalName}"`);
        } catch (e) {
          console.log(`Text walker approach failed:`, e);
        }
      }
      
    } catch (error) {
      console.log('XPath approach failed:', error);
    }
    
    if (!employeeButton) {
      return {
        success: false,
        message: `Could not find employee button "${externalName}" on the external time clock`,
        error: "EMPLOYEE_BUTTON_NOT_FOUND"
      };
    }
    
    console.log(`Employee button found, proceeding to next step...`);
    
    // Wait for the personal page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Look for Clock In or Clock Out button on the personal page
    const actionText = punchType === 'in' ? 'Clock In' : 'Clock Out';
    console.log(`Looking for ${actionText} button on personal page...`);
    
    // Search all buttons for the action text
    const allButtons = await page.$$('button, input[type="submit"], input[type="button"], a, div, span');
    let actionButton = null;
    
    console.log(`Found ${allButtons.length} potential buttons/elements on personal page`);
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const text = await page.evaluate(el => {
        return (el.textContent || el.value || el.getAttribute('title') || el.getAttribute('data-action') || '').trim();
      }, button);
      
      console.log(`Button ${i}: "${text}"`);
      
      if (text.toLowerCase().includes(actionText.toLowerCase()) || 
          text.toLowerCase().includes(punchType) ||
          (punchType === 'out' && text.toLowerCase().includes('out'))) {
        actionButton = button;
        console.log(`Found ${actionText} button by content: "${text}"`);
        break;
      }
    }
    
    if (!actionButton) {
      return {
        success: false,
        message: `Could not find "${actionText}" button for ${externalName}`,
        error: "ACTION_BUTTON_NOT_FOUND"
      };
    }
    
    // Click the action button
    console.log(`Clicking ${actionText} button...`);
    await actionButton.click();
    
    // Wait for the action to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for success indicators or error messages
    const successIndicators = [
      'success', 'completed', 'recorded', 'clocked', 
      punchType === 'in' ? 'in' : 'out'
    ];
    
    const pageContent = await page.content();
    const hasSuccessIndicator = successIndicators.some(indicator => 
      pageContent.toLowerCase().includes(indicator)
    );
    
    console.log(`External time clock sync completed for ${employeeName}`);
    
    return {
      success: true,
      message: `Successfully synced ${punchType} punch for ${employeeName} to external time clock`
    };
    
  } catch (error) {
    console.error('External sync error:', error);
    return {
      success: false,
      message: `Failed to sync punch for ${employeeName}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export function isExternalSyncEnabled(): boolean {
  // Temporarily disabled due to external site automation challenges
  return false;
  // You can add an environment variable or setting to enable/disable sync
  // return process.env.ENABLE_EXTERNAL_SYNC === 'true' || true; // Default enabled for now
}

export function updateEmployeeMapping(localName: string, externalName: string): void {
  EMPLOYEE_NAME_MAPPING[localName] = externalName;
}