import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="5c525163-bfde-4e06-bdee-9b0e9d0f931b",
    name="Explore and Analyze Judging Results",
    tc_id="TC-3",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"answer_2": "GFS", "answer_3": "\u201cWind owns the center of the ring across this card. GFS sits closest to the three-model consensus overall\u2014not necessarily closest to reality\u2014while agreement is steady through day three.\u201d", "answer": "SPLIT DECISION", "answer_4": "Agreement starts at 100. Differences create capped penalties: temperature (20\u00b0F cap, 35% weight), precipitation probability (100-point cap, 40%), and wind (30 mph cap, 25%). If a round is unavailable, its weight is removed and the rest are renormalized. This score measures similarity, not which model is right."},
    auto_heal_version="AH2",
    default_action_timeout_ms=10000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000', instruction_id='87b516f1-9ed8-4525-ba42-6aab1ddb9a25'):
        await page.goto("http://localhost:3000")
    
    async with testmu.step('Clicking Surprise Me button', instruction_id='6c8268a3-1325-4212-a0d9-ff19cba6a624'):
        _loc_1 = page.locator("internal:role=button[name=\"⚄ SURPRISE ME\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('Reading the model closest to consensus from the Consensus Table section'):
        set_var('answer_2', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {83: 0};\n  const el = (i) => els[__m[i]];\n  const __v = ((el(83)?.innerText.match(/([A-Z]+)\\s*★\\s*CLOSEST TO CONSENSUS/i)?.[1] ?? null));\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="1ECMWFIN THE PACK2GFS★"i'], query='the model closest to consensus in the Consensus Table section', expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='Who is closest to consensus in the Consensus Table section is saved as {{answer_2}}.'))
    
    async with testmu.step('Reading the RingSide Commentary text'):
        set_var('answer_3', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {92: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(92)?.textContent?.trim() ?? null);\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="“Wind owns the center of the"i'], query='the RingSide Commentary text', expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='The RingSide Commentary is saved as {{answer_3}}.'))
    
    async with testmu.step('Scroll target into view', instruction_id='02e62857-a11d-47fc-ab0d-55805465064a'):
        element_0 = page.locator("internal:text=\"How the judges score it ＋\"i")
        await element_0.evaluate("el => el.scrollIntoView({block: 'center'})")
    
    async with testmu.step('Clicking How the judges score it expand control', instruction_id='e82dd0d9-e1cf-48d7-acc3-db041ab8a371'):
        _loc_2 = page.locator("internal:text=\"How the judges score it ＋\"i")
        
        await _loc_2.click()
    
    async with testmu.step("Reading the verdict from the judges' scorecard"):
        set_var('answer', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {71: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(71)?.textContent?.trim() ?? null);\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="SPLIT DECISION"i'], query="the verdict shown in the judges' scorecard results", expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='What is shown in the printed results is saved as {{answer}}.'))
    
    async with testmu.step('Reading the explanation from the How the judges score it section'):
        set_var('answer_4', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {96: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(96)?.textContent?.trim() ?? null);\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Agreement starts at 100."i'], query='the explanation text shown in the How the judges score it section', expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='What is shown in the How the judges score it section after clicking the plus sign is saved as {{answer_4}}.'))


if __name__ == "__main__":
    testmu.run(test)