const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs');
const app = express();

app.use(express.json());

app.post('/run-test', async (req, res) => {
  const { url, instructions } = req.body;

  if (!url || !instructions) {
    return res.status(400).json({ error: 'Missing url or instructions' });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  let result = { steps: [], screenshots: [] };

  try {
    await page.goto(url);

    for (let i = 0; i < instructions.length; i++) {
      const step = instructions[i];
      try {
        // Basic instruction runner
        if (step.action === 'click') {
          await page.click(step.selector);
        } else if (step.action === 'type') {
          await page.fill(step.selector, step.value);
        } else if (step.action === 'wait') {
          await page.waitForTimeout(step.duration);
        }

        const screenshotPath = `screenshot-${i}.png`;
        await page.screenshot({ path: screenshotPath });
        result.screenshots.push(screenshotPath);
        result.steps.push({ step, status: 'passed' });

      } catch (stepError) {
        result.steps.push({ step, status: 'failed', error: stepError.message });
        break;
      }
    }

    await browser.close();
    // Read all screenshots and convert to base64
    const encodedScreenshots = result.screenshots.map((path) => {
      const image = fs.readFileSync(path);
      return { path, base64: image.toString('base64') };
    });

    return res.json({ result: result.steps, screenshots: encodedScreenshots });

  } catch (error) {
    await browser.close();
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));