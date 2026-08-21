import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="56ad1a0e-1f06-41a1-a8ca-19ee356f3438",
    name="Start Matchup and Verify Result",
    tc_id="TC-2",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"result_posted_check": "true", "answer": "\u201cTemperature owns the center of the ring across this card. ECMWF sits closest to the three-model consensus overall\u2014not necessarily closest to reality\u2014while agreement is diverging through day three.\u201d"},
    auto_heal_version="AH2",
    default_action_timeout_ms=10000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000', instruction_id='c98739ad-4664-4180-8ed1-e46590ba4ad2'):
        await page.goto("http://localhost:3000")
    
    async with testmu.step('Clicking Start Matchup button', instruction_id='871d9924-61bd-4a24-88f6-62a4c1403870'):
        _loc_1 = page.locator("internal:role=button[name=\"START MATCHUP ›\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('Checking whether a result commentary is present'):
        set_var('result_posted_check', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {91: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (!!el(91)?.nextElementSibling?.textContent);\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="RINGSIDE COMMENTARY"i'], query='whether a result commentary is present in the ringside commentary section', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='a result was posted'))
    
    async with testmu.step('Reading the posted result text'):
        set_var('answer', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {92: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(92)?.textContent ?? null);\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="“Temperature owns the center"i'], query='the posted result text in the ringside commentary blockquote', expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='the result that was posted'))
    
    async with testmu.step('Assertion check', instruction_id='933125bc-b668-4dc0-848c-93a31f58a839'):
        await testmu.verify_assertion(page, 'Assertion check', {'operator': ['equals'], 'assertion_operands': [], 'left_operand': None, 'right_operand': None, 'operands': [], 'sub_results': [{'description': 'a result was posted', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{result_posted_check}}', 'store_key': 'result_posted_check', 'variable_refs': {'{{result_posted_check}}': 'true'}}], 'sub_checks': [{'description': 'a result was posted', 'store_key': 'result_posted_check', 'expected_value': 'true', 'extracted_value': '{{result_posted_check}}', 'operator': 'equals', 'transforms': []}], 'composite_operator': 'and', 'claim': 'verify that a result was posted'})


if __name__ == "__main__":
    testmu.run(test)