
// src/app/api/fetch-bill-data/route.ts
import { type NextRequest, NextResponse } from 'next/server';

// IMPORTANT: This is a SIMULATED API route.
// You will need to implement actual web scraping logic here
// using a library like 'cheerio' or 'puppeteer' to fetch data
// from https://web.senate.gov.ph/lis/leg_sys.aspx or other sources.

function generateMockBillText(congress: string, billNumber: string, keyword?: string): string {
  const chamber = billNumber.toUpperCase().startsWith('HR') ? 'House of Representatives' : 
                  billNumber.toUpperCase().startsWith('S') ? 'Senate' : 'Legislature';
  
  let text = `
    **An Act Concerning ${keyword ? `Various Matters Related to ${keyword}` : `Public Welfare and Governance`}**

    *Be it enacted by the Senate and ${chamber === 'Senate' ? 'House of Representatives of the Philippines' : chamber} in Congress assembled:*

    **SECTION 1. Short Title.** - This Act shall be known as the "${keyword ? keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Act' : 'Comprehensive Development Act'}".
    (Mock data for ${congress}, Bill ${billNumber})

    **SECTION 2. Declaration of Policy.** - It is hereby declared the policy of the State to promote a just and dynamic social order that will ensure the prosperity and independence of the nation and free the people from poverty through policies that provide adequate social services, promote full employment, a rising standard of living, and an improved quality of life for all.
    ${keyword ? `This bill specifically addresses aspects of ${keyword} by proposing new regulatory frameworks and enforcement mechanisms.` : ''}

    **SECTION 3. Definition of Terms.** - As used in this Act:
      (a) "Agency" refers to any government department, bureau, office, instrumentality, or government-owned or -controlled corporation.
      (b) "Stakeholder" refers to any individual, group, or organization affected by or having an interest in the implementation of this Act.
      ${keyword ? `(c) "${keyword}" shall mean specific activities or data points relevant to the core subject of this bill.` : ''}

    **SECTION 4. Key Provisions.**
      - Establishment of a National ${keyword ? keyword : 'Development'} Council.
      - Allocation of funds for research and development in related fields.
      - Mandated public consultations for implementing rules and regulations.
      - Penalties for non-compliance: Fines ranging from PHP 100,000 to PHP 1,000,000 and/or imprisonment.

    **SECTION 5. Implementing Rules and Regulations (IRR).** - Within ninety (90) days from the effectivity of this Act, the lead agency, in consultation with relevant stakeholders, shall promulgate the necessary rules and regulations for the effective implementation of this Act.

    **SECTION 6. Appropriations.** - The amount necessary to carry out the provisions of this Act shall be included in the General Appropriations Act of the year following its enactment into law and thereafter.

    **SECTION 7. Separability Clause.** - If any provision or part hereof is held invalid or unconstitutional, the remainder of the law or the provision not otherwise affected shall remain valid and subsisting.

    **SECTION 8. Repealing Clause.** - Any law, presidential decree or issuance, executive order, letter of instruction, administrative order, rule or regulation contrary to or inconsistent with the provisions of this Act is hereby repealed, modified, or amended accordingly.

    **SECTION 9. Effectivity.** - This Act shall take effect fifteen (15) days after its publication in the Official Gazette or in a newspaper of general circulation.

    *Approved, (Simulated Approval Date)*
    (This is mock data generated for demonstration purposes for ${billNumber} of the ${congress} Congress.)
  `;
  return text;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const congress = searchParams.get('congress') || 'N/A';
  const billNumber = searchParams.get('billNumber') || 'N/A';
  const keyword = searchParams.get('keyword');

  // In a real implementation, you would use 'congress' and 'billNumber'
  // to construct a URL for the target website, then fetch and parse its HTML.
  // For example, with 'cheerio':
  // const targetUrl = `https://web.senate.gov.ph/lis/bill_res.aspx?congress=${congress}&q=${billNumber}`;
  // const response = await fetch(targetUrl);
  // const html = await response.text();
  // const $ = cheerio.load(html);
  // const billText = $('#bill_text_container_id').text(); // (Adjust selector)

  // For now, we return simulated text:
  const billText = generateMockBillText(congress, billNumber, keyword || undefined);

  if (!billText) {
    return NextResponse.json({ error: 'Bill not found or unable to fetch text.' }, { status: 404 });
  }

  return NextResponse.json({ billText });
}
