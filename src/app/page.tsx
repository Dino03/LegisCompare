
"use client";

import { useState, type FormEvent, useRef, type ChangeEvent, type ReactNode } from 'react';
import { FileText, Users, Scale, Edit3, Search, Loader2, Download, UploadCloud, XCircle, Link as LinkIcon, ListChecks } from 'lucide-react';

// ShadCN UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

// AI Flows
import { summarizeBill, type SummarizeBillInput, type SummarizeBillOutput } from '@/ai/flows/bill-summarization';
import { billComparison, type BillComparisonInput, type BillComparisonOutput } from '@/ai/flows/bill-comparison';
import { detailedSECBillAnalysis, type DetailedSECBillAnalysisInput, type DetailedSECBillAnalysisOutput } from '@/ai/flows/detailed-sec-bill-analysis';

interface BillDetails {
  congress: string;
  number: string;
  title?: string;
  summary?: string;
  text?: string; 
  chamber?: 'House' | 'Senate' | 'N/A' | 'RA'; // Added RA for Republic Act context
  file?: File | null;
  fileName?: string;
  isPasted?: boolean; 
}

interface ComparisonResult extends BillComparisonOutput {}

export default function LegislateComparePage() {
  const initialBillState: BillDetails = { congress: '', number: '', text: '', chamber: 'N/A', file: null, fileName: '', isPasted: false, title: '' };
  const [bill1, setBill1] = useState<BillDetails>({ ...initialBillState });
  const [bill2, setBill2] = useState<BillDetails>({ ...initialBillState });
  const [keyword, setKeyword] = useState('');

  const bill1FileInputRef = useRef<HTMLInputElement>(null);
  const bill2FileInputRef = useRef<HTMLInputElement>(null);

  const [bill1Summary, setBill1Summary] = useState<SummarizeBillOutput | null>(null);
  const [bill2Summary, setBill2Summary] = useState<SummarizeBillOutput | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [detailedAnalysisResult, setDetailedAnalysisResult] = useState<DetailedSECBillAnalysisOutput | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [editableCommentBill1, setEditableCommentBill1] = useState('');
  const [editableCommentBill2, setEditableCommentBill2] = useState('');

  const getChamberFromBillNumber = (billNumber: string): BillDetails['chamber'] => {
    if (!billNumber) return 'N/A';
    const upperCaseBillNumber = billNumber.toUpperCase();
    if (upperCaseBillNumber.startsWith('HR') || upperCaseBillNumber.startsWith('H.R.') || upperCaseBillNumber.startsWith('HB')) return 'House';
    if (upperCaseBillNumber.startsWith('S.') || upperCaseBillNumber.startsWith('SB') || upperCaseBillNumber.startsWith('S.RES') || upperCaseBillNumber.startsWith('S.J.RES') || upperCaseBillNumber.startsWith('SBN')) return 'Senate';
    if (upperCaseBillNumber.startsWith('RA') || upperCaseBillNumber.startsWith('R.A.')) return 'RA';
    return 'N/A'; 
  };

  const fetchBillText = async (congress: string, billNum: string, keywordSearch?: string): Promise<string> => {
    const params = new URLSearchParams();
    if (congress) params.append('congress', congress);
    if (billNum) params.append('billNumber', billNum);
    if (keywordSearch) params.append('keyword', keywordSearch);

    const response = await fetch(`/api/fetch-bill-data?${params.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch bill text from API.' }));
      throw new Error(errorData.error || `API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.billText) {
        throw new Error("Bill text not found in API response.");
    }
    return data.billText;
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>, billSetter: React.Dispatch<React.SetStateAction<BillDetails>>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      billSetter(prev => ({ 
        ...initialBillState,
        congress: prev.congress, 
        number: prev.number,     
        file: file,
        fileName: file.name,
        text: `Simulated text from uploaded PDF: ${file.name}. Actual PDF content extraction is not implemented.`,
        title: `Uploaded PDF: ${file.name}`,
        chamber: prev.number ? getChamberFromBillNumber(prev.number) : 'N/A', 
        isPasted: false,
      }));
      setKeyword(''); 
      toast({ title: "PDF Selected", description: `${file.name} is ready. Analysis will use simulated text based on this file.` });
    } else if (file) {
      toast({ title: "Invalid File", description: "Please select a PDF file.", variant: "destructive" });
      event.target.value = ""; 
    }
  };

  const handleClearFile = (billSetter: React.Dispatch<React.SetStateAction<BillDetails>>, fileInputRef: React.RefObject<HTMLInputElement>) => {
    billSetter(prev => ({
      ...initialBillState,
      congress: prev.congress, 
      number: prev.number,
      chamber: prev.number ? getChamberFromBillNumber(prev.number) : 'N/A',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
    toast({ title: "Input Cleared", description: "You can now enter bill details manually or upload another PDF." });
  };
  
  const handleBillInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    field: 'congress' | 'number',
    billSetter: React.Dispatch<React.SetStateAction<BillDetails>>
  ) => {
    const value = e.target.value;
    billSetter(prev => {
      const updatedBill = { 
        ...initialBillState, 
        congress: field === 'congress' ? value : prev.congress,
        number: field === 'number' ? value : prev.number,
        chamber: field === 'number' ? getChamberFromBillNumber(value) : getChamberFromBillNumber(prev.number),
      };
      if (field === 'congress' && prev.number) {
        updatedBill.number = prev.number;
        updatedBill.chamber = getChamberFromBillNumber(prev.number);
      } else if (field === 'number' && prev.congress) {
        updatedBill.congress = prev.congress;
      }
      return updatedBill;
    });
    setKeyword(''); 
  };
  
  const handlePastedTextChange = (
    e: ChangeEvent<HTMLTextAreaElement>,
    billSetter: React.Dispatch<React.SetStateAction<BillDetails>>
  ) => {
    const pastedText = e.target.value;
    billSetter(prev => ({ 
      ...initialBillState, 
      congress: prev.congress,
      number: prev.number,
      text: pastedText,
      title: pastedText ? 'Pasted Bill Text' : '',
      isPasted: !!pastedText,
      chamber: prev.number ? getChamberFromBillNumber(prev.number) : 'N/A', 
    }));
    setKeyword('');
    if (billSetter === setBill1 && bill1FileInputRef.current) bill1FileInputRef.current.value = "";
    if (billSetter === setBill2 && bill2FileInputRef.current) bill2FileInputRef.current.value = "";
  };

  const handleKeywordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newKeyword = e.target.value;
    setKeyword(newKeyword);
    if (newKeyword) {
      setBill1(prev => ({ 
        ...initialBillState, 
        congress: prev.congress, 
        number: prev.number,   
        chamber: getChamberFromBillNumber(prev.number) 
      }));
      setBill2({ ...initialBillState });
      if (bill1FileInputRef.current) bill1FileInputRef.current.value = "";
      if (bill2FileInputRef.current) bill2FileInputRef.current.value = "";
    }
  };

  const handleProcessBills = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setBill1Summary(null);
    setBill2Summary(null);
    setComparisonResult(null);
    setDetailedAnalysisResult(null);
    setEditableCommentBill1('');
    setEditableCommentBill2('');

    const bill1ManualInputProvided = bill1.congress && bill1.number;
    const bill2ManualInputProvided = bill2.congress && bill2.number;

    const isBill1Provided = bill1ManualInputProvided || bill1.file || bill1.isPasted || (keyword && (bill1.congress || bill1.number));
    const isBill2Provided = bill2ManualInputProvided || bill2.file || bill2.isPasted;

    if (!isBill1Provided && !keyword) {
        toast({ title: "Input Error", description: "Please provide details for at least the Senate Version (manual, PDF, or pasted text) or a keyword.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    let currentBill1Info: BillDetails = { ...bill1 };
    let currentBill2Info: BillDetails = { ...bill2 };
    
    try {
      if (currentBill1Info.file && currentBill1Info.fileName) {
          currentBill1Info.congress = currentBill1Info.congress || 'N/A (Uploaded PDF)'; 
          currentBill1Info.number = currentBill1Info.number || currentBill1Info.fileName; 
          currentBill1Info.chamber = currentBill1Info.chamber === 'N/A' || !currentBill1Info.chamber ? getChamberFromBillNumber(currentBill1Info.number) : currentBill1Info.chamber;
          currentBill1Info.title = `Uploaded PDF: ${currentBill1Info.fileName}`;
          currentBill1Info.isPasted = false;
      } else if (currentBill1Info.isPasted && currentBill1Info.text) {
          currentBill1Info.congress = currentBill1Info.congress || 'N/A (Pasted Text)';
          currentBill1Info.number = currentBill1Info.number || 'Pasted Content';
          currentBill1Info.chamber = currentBill1Info.chamber === 'N/A' || !currentBill1Info.chamber ? getChamberFromBillNumber(currentBill1Info.number) : currentBill1Info.chamber; 
          currentBill1Info.title = currentBill1Info.title || 'Pasted Bill Text';
      } else if (keyword) {
          const congressForSearch = currentBill1Info.congress || "N/A";
          const numberForSearch = currentBill1Info.number || "KeywordSearch";
          const chamberForSearch = getChamberFromBillNumber(numberForSearch === "KeywordSearch" ? "" : numberForSearch);
          
          const billText1 = await fetchBillText(congressForSearch, numberForSearch, keyword);
          currentBill1Info = {
              ...currentBill1Info, 
              text: billText1,
              chamber: chamberForSearch,
              title: `Bill matching "${keyword}" ${numberForSearch !== "KeywordSearch" ? `(${numberForSearch}${congressForSearch !== "N/A" ? ", " + congressForSearch : ""})` : `(Keyword: ${keyword})` }`,
              file: null, fileName: '', isPasted: false, 
          };
          currentBill2Info = { ...initialBillState }; 
      } else if (bill1ManualInputProvided) {
          const billText1 = await fetchBillText(currentBill1Info.congress, currentBill1Info.number);
          currentBill1Info.text = billText1;
          currentBill1Info.chamber = currentBill1Info.chamber === 'N/A' || !currentBill1Info.chamber ? getChamberFromBillNumber(currentBill1Info.number) : currentBill1Info.chamber;
          currentBill1Info.title = `${currentBill1Info.chamber !== 'N/A' ? currentBill1Info.chamber + ' ' : ''}Bill ${currentBill1Info.number} (${currentBill1Info.congress})`;
          currentBill1Info.file = null; currentBill1Info.fileName = ''; currentBill1Info.isPasted = false;
      } else if (!currentBill1Info.text && isBill1Provided) { 
          toast({ title: "Input Error", description: "Could not determine text for Senate Version.", variant: "destructive" });
          setIsLoading(false); return;
      } else if (!isBill1Provided) { 
          toast({ title: "Input Error", description: "Please provide Senate Version details or a keyword.", variant: "destructive" });
          setIsLoading(false); return;
      }
      setBill1(currentBill1Info); 

      if (!keyword && isBill2Provided) {
        if (currentBill2Info.file && currentBill2Info.fileName) {
            currentBill2Info.congress = currentBill2Info.congress || 'N/A (Uploaded PDF)';
            currentBill2Info.number = currentBill2Info.number || currentBill2Info.fileName;
            currentBill2Info.chamber = currentBill2Info.chamber === 'N/A' || !currentBill2Info.chamber ? getChamberFromBillNumber(currentBill2Info.number) : currentBill2Info.chamber;
            currentBill2Info.title = `Uploaded PDF: ${currentBill2Info.fileName}`;
            currentBill2Info.isPasted = false;
        } else if (currentBill2Info.isPasted && currentBill2Info.text) {
            currentBill2Info.congress = currentBill2Info.congress || 'N/A (Pasted Text)';
            currentBill2Info.number = currentBill2Info.number || 'Pasted Content';
            currentBill2Info.chamber = currentBill2Info.chamber === 'N/A' || !currentBill2Info.chamber ? getChamberFromBillNumber(currentBill2Info.number) : currentBill2Info.chamber;
            currentBill2Info.title = currentBill2Info.title || 'Pasted Bill Text';
        } else if (bill2ManualInputProvided) {
            const billText2 = await fetchBillText(currentBill2Info.congress, currentBill2Info.number);
            currentBill2Info.text = billText2;
            currentBill2Info.chamber = currentBill2Info.chamber === 'N/A' || !currentBill2Info.chamber ? getChamberFromBillNumber(currentBill2Info.number) : currentBill2Info.chamber;
            currentBill2Info.title = `${currentBill2Info.chamber !== 'N/A' ? currentBill2Info.chamber + ' ' : ''}Bill ${currentBill2Info.number} (${currentBill2Info.congress})`;
            currentBill2Info.file = null; currentBill2Info.fileName = ''; currentBill2Info.isPasted = false;
        } else if (!currentBill2Info.text && isBill2Provided) {
            toast({ title: "Input Error", description: "Could not determine text for House Version.", variant: "destructive" });
            setIsLoading(false); return;
        }
        setBill2(currentBill2Info); 
      } else if (!keyword && !isBill2Provided) {
        setBill2({...initialBillState}); 
      }

      const performDetailedAnalysis = currentBill1Info.text && !isBill2Provided && !keyword;
      const performComparison = currentBill1Info.text && currentBill2Info.text && !keyword;
      const performSimpleSummary = currentBill1Info.text && !performDetailedAnalysis && !performComparison; 

      if (!currentBill1Info.text) {
        toast({ title: "Processing Error", description: "Senate Version text could not be obtained or generated. Cannot proceed with analysis.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (performDetailedAnalysis) {
        toast({ title: "Performing Detailed Analysis", description: "Generating in-depth SEC regulatory analysis for the Senate Version." });
        const analysisInput: DetailedSECBillAnalysisInput = {
          billText: currentBill1Info.text as string, 
          billTitle: currentBill1Info.title || `Bill ${currentBill1Info.number || 'N/A'}`,
          billNumber: currentBill1Info.number,
          legislativeChamber: currentBill1Info.chamber,
        };
        const detailedData = await detailedSECBillAnalysis(analysisInput);
        setDetailedAnalysisResult(detailedData);
        if (detailedData.part2ExecutiveSummary?.mainObjectivesAndKeyProvisions) {
            setBill1Summary({ summary: detailedData.part2ExecutiveSummary.mainObjectivesAndKeyProvisions });
        }

      } else if (performComparison) {
        if (!currentBill2Info.text) {
            toast({ title: "Processing Error", description: "House Version text could not be obtained for comparison.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        toast({ title: "Performing Comparison", description: "Summarizing and comparing Senate and House Versions." });
        const summary1 = await summarizeBill({ billText: currentBill1Info.text as string, congressNumber: currentBill1Info.congress, billNumber: currentBill1Info.number });
        setBill1Summary(summary1);
        const summary2 = await summarizeBill({ billText: currentBill2Info.text as string, congressNumber: currentBill2Info.congress, billNumber: currentBill2Info.number });
        setBill2Summary(summary2);

        const comparisonInput: BillComparisonInput = {
          bill1Summary: summary1.summary,
          bill2Summary: summary2.summary,
        };
        const comparisonData = await billComparison(comparisonInput);
        setComparisonResult(comparisonData);
        setEditableCommentBill1(comparisonData.regulatoryImpactAssessmentBill1);
        setEditableCommentBill2(comparisonData.regulatoryImpactAssessmentBill2);

      } else if (performSimpleSummary) { 
        toast({ title: "Performing Summary", description: `Generating summary for ${keyword ? 'keyword search result' : 'the bill'}.` });
        const summary1 = await summarizeBill({ billText: currentBill1Info.text as string, congressNumber: currentBill1Info.congress, billNumber: currentBill1Info.number });
        setBill1Summary(summary1);
      }
      
      toast({ title: "Processing Complete", description: "Analysis finished." });
    } catch (error) {
      console.error("Error processing bills:", error);
      toast({ title: "Error", description: `Failed to process bills. ${error instanceof Error ? error.message : 'Unknown error.'}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExportComment = (commentText: string, billTitle: string) => {
    if (!commentText) {
        toast({ title: "No Comment", description: "There is no comment to export.", variant: "destructive"});
        return;
    }
    const blob = new Blob([commentText], { type: 'text/plain;charset=utf-f8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeBillTitle = billTitle.replace(/[^a-zA-Z0-9_.-]/g, '_') || "Comment";
    link.download = `SEC_Comment_${safeBillTitle}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Exported", description: `Comment for ${billTitle} downloaded.`});
  };

  const isBill1InputDisabled = !!bill1.file || !!bill1.isPasted || !!keyword;
  const isBill1PdfUploadDisabled = !!bill1.isPasted || (!!bill1.congress && !!bill1.number) || !!keyword;
  const isBill1TextareaDisabled = !!bill1.file || (!!bill1.congress && !!bill1.number) || !!keyword;

  const isBill2InputDisabled = !!bill2.file || !!bill2.isPasted || !!keyword;
  const isBill2PdfUploadDisabled = !!bill2.isPasted || (!!bill2.congress && !!bill2.number) || !!keyword;
  const isBill2TextareaDisabled = !!bill2.file || (!!bill2.congress && !!bill2.number) || !!keyword;
  
  const isKeywordSearchDisabled = !!bill1.file || !!bill2.file || !!bill1.isPasted || !!bill2.isPasted;

  const generateBillLink = (
    billId: string | undefined, // Can be a number like "1234" or full "HB1234" / "SBN-567"
    chamberType: string | undefined, // 'house', 'senate', 'ra', or from AI for the main bill
    originalCongressInput: string | undefined,
    fullMatchText?: string // The originally matched text e.g. "HB 1234", used as display text
  ): string | null => {
    if (!billId || !chamberType || billId.toLowerCase() === 'not specified' || billId.toLowerCase() === 'n/a' || chamberType.toLowerCase() === 'not specified' || chamberType.toLowerCase() === 'n/a') {
      return null;
    }
  
    const congressNumericMatch = originalCongressInput?.match(/\d+/);
    const congressNumeric = congressNumericMatch ? congressNumericMatch[0] : null;
  
    const lowerChamber = chamberType.toLowerCase();
    const billNumberClean = billId.replace(/\D/g, ''); // Get just the numeric part for some URLs
  
    if (lowerChamber.includes('house')) {
      if (!congressNumeric) return null;
      // Normalize: HB01234, HB 1234 -> HB1234 (remove spaces, ensure HB prefix)
      // Use the number from fullMatchText if possible, otherwise from billId
      const billIdentifierForHouse = fullMatchText ? fullMatchText.replace(/\s/g, '').toUpperCase() : billId.replace(/\s/g, '').toUpperCase();
      const finalHouseBillNumber = billIdentifierForHouse.startsWith('HB') ? billIdentifierForHouse : 
                                  (billIdentifierForHouse.startsWith('H.R.') ? billIdentifierForHouse.replace('H.R.','HB') : `HB${billIdentifierForHouse.replace(/\D/g, '')}`);

      return `https://docs.congress.hrep.online/legisdocs/basic_${congressNumeric}/${encodeURIComponent(finalHouseBillNumber)}.pdf`;

    } else if (lowerChamber.includes('senate')) {
      if (!congressNumeric) return null;
      // For Senate, the q parameter often includes SBN- or SB. Use fullMatchText or billId for query.
      const queryParam = fullMatchText || billId;
      return `https://web.senate.gov.ph/lis/bill_res.aspx?congress=${congressNumeric}&q=${encodeURIComponent(queryParam)}`;

    } else if (lowerChamber.includes('ra') || lowerChamber.includes('republic act')) {
      // Republic Act: https://www.officialgazette.gov.ph/republic-acts/republic-act-no-11976/
      // Number usually doesn't have leading zeros for RA links.
      const numericRaNumber = billNumberClean.replace(/^0+/, '');
      if (!numericRaNumber) return null;
      return `https://www.officialgazette.gov.ph/republic-acts/republic-act-no-${numericRaNumber}/`;
    }
    
    return null;
  };
  
  const processTextForLinks = (text: string, originalCongressInput: string | undefined): React.ReactNode[] => {
    if (!text || typeof text !== 'string') return [text];
  
    // Order matters: More specific (like "Republic Act No. 123") before less specific ("RA 123")
    // Capture groups: (1: full prefix like "House Bill No."), (2: optional "No."), (3: main prefix like HB), (4: number)
    const billPatternsConfig = [
      // Republic Acts
      { type: 'ra', regex: /(Republic\sAct(?:\s*No\.?)?|R\.A\.(?:\s*No\.?)?|RA)\s*(\d+)/gi, numberGroup: 2, prefixGroup:1 },
      // House Bills / Resolutions (Order HR before HB if HR is meant to be distinct, otherwise combine)
      { type: 'house', regex: /(House\sBill(?:\s*No\.?)?|H\.B\.(?:\s*No\.?)?|HB|House\sResolution(?:\s*No\.?)?|H\.Res\.(?:\s*No\.?)?|HR)\s*(\d+)/gi, numberGroup: 2, prefixGroup: 1 },
      // Senate Bills / Resolutions
      { type: 'senate', regex: /(Senate\sBill(?:\s*No\.?)?|S\.B\.(?:\s*No\.?)?|SBN|Senate\sResolution(?:\s*No\.?)?|S\.Res\.(?:\s*No\.?)?|SR)\s*(\d+)/gi, numberGroup: 2, prefixGroup: 1 },
    ];
      
    interface MatchInfo {
      index: number;
      length: number;
      fullMatchText: string; // The entire matched string e.g., "HB 1234"
      billNumber: string;    // Just the number e.g., "1234"
      type: 'house' | 'senate' | 'ra';
    }
    const allMatches: MatchInfo[] = [];
  
    billPatternsConfig.forEach(config => {
      let match;
      while ((match = config.regex.exec(text)) !== null) {
        allMatches.push({
          index: match.index,
          length: match[0].length,
          fullMatchText: match[0],
          billNumber: match[config.numberGroup],
          type: config.type as 'house' | 'senate' | 'ra',
        });
      }
    });
  
    allMatches.sort((a, b) => a.index - b.index);
  
    const uniqueMatches: MatchInfo[] = [];
    let currentEnd = -1;
    for (const match of allMatches) { 
      if (match.index >= currentEnd) {
        uniqueMatches.push(match);
        currentEnd = match.index + match.length;
      }
    }
  
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
  
    uniqueMatches.forEach((matchInfo, i) => {
      if (matchInfo.index > lastIndex) {
        parts.push(text.substring(lastIndex, matchInfo.index));
      }
      
      const link = generateBillLink(matchInfo.billNumber, matchInfo.type, originalCongressInput, matchInfo.fullMatchText);
      if (link) {
        parts.push(
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline" key={`${matchInfo.type}-${matchInfo.billNumber}-${matchInfo.index}-${i}`}>
            {matchInfo.fullMatchText} <LinkIcon className="inline-block h-3 w-3 ml-0.5 align-baseline" />
          </a>
        );
      } else {
        parts.push(matchInfo.fullMatchText);
      }
      lastIndex = matchInfo.index + matchInfo.length;
    });
  
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
  
    return parts.length > 0 ? parts : [text];
  };

  const renderArrayOrString = (data: string | string[] | undefined | boolean, defaultText: string = "N/A"): ReactNode => {
    const congressInputForLinks = bill1.congress; 
  
    if (data === undefined || data === null || (typeof data === 'string' && data.trim() === '' && typeof data !== 'boolean')) {
      return <p className="text-sm text-muted-foreground">{defaultText}</p>;
    }
    if (typeof data === 'boolean') {
      return <p className="text-sm whitespace-pre-wrap leading-relaxed">{data ? "Yes" : "No"}</p>;
    }
  
    if (Array.isArray(data)) {
      if (data.length === 0) return <p className="text-sm text-muted-foreground">{defaultText}</p>;
      return (
        <ul className="list-disc pl-5 space-y-1">
          {data.map((item, index) => (
            <li key={index} className="text-sm leading-relaxed">
              {processTextForLinks(item, congressInputForLinks)}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof data === 'string') {
      const processedContent = processTextForLinks(data, congressInputForLinks);
      // Check if processedContent is just a single empty string or the default text, indicating no real content or links
      if (Array.isArray(processedContent) && processedContent.length === 1 && typeof processedContent[0] === 'string' && (processedContent[0].trim() === '' || processedContent[0] === defaultText)) {
         return <p className="text-sm text-muted-foreground">{defaultText}</p>;
      }
      if (data.trim() === '' || data === defaultText) {
         return <p className="text-sm text-muted-foreground">{defaultText}</p>;
      }
      return <p className="text-sm whitespace-pre-wrap leading-relaxed">{processedContent}</p>;
    }
    
    return <p className="text-sm text-muted-foreground">{defaultText}</p>;
  };


  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-body">
      <header className="mb-8 text-center">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary mb-2">Legislate Compare</h1>
        <p className="text-muted-foreground text-lg">Analyze and compare legislative bills with AI-powered insights.</p>
        <p className="text-sm text-muted-foreground">(Note: PDF content analysis is simulated. Summaries are based on filename/placeholder text.)</p>
      </header>

      <Card className="mb-8 shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="bg-primary/5">
          <CardTitle className="font-headline text-2xl flex items-center text-primary"><FileText className="mr-3" />Bill Input & Search</CardTitle>
          <CardDescription>Enter details (Congress/Number), upload a PDF, OR paste bill text. Alternatively, search by keyword for single bill analysis.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleProcessBills} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Bill 1 Input Block */}
              <div className="space-y-3 p-4 border rounded-md shadow-sm bg-card">
                <h3 className="font-headline text-lg text-primary">Senate Version</h3>
                <Input 
                  aria-label="Senate Bill Congress Number"
                  placeholder="Congress Number (e.g., 19 or 19th)" 
                  value={bill1.congress} 
                  onChange={(e) => handleBillInputChange(e, 'congress', setBill1)}
                  disabled={isBill1InputDisabled}
                />
                <Input 
                  aria-label="Senate Bill Number"
                  placeholder="Senate Bill Number (e.g., SBN-1234, SRN-56)" 
                  value={bill1.number} 
                  onChange={(e) => handleBillInputChange(e, 'number', setBill1)} 
                  disabled={isBill1InputDisabled}
                />
                {bill1.number && !bill1.file && !bill1.isPasted && !keyword && <p className="text-xs text-muted-foreground">Detected Chamber: {getChamberFromBillNumber(bill1.number)}</p>}
                
                <div className="text-sm text-muted-foreground text-center my-1">OR</div>
                
                <div className="flex items-center space-x-2">
                  <label htmlFor="bill1-pdf-upload" className={`flex-grow ${isBill1PdfUploadDisabled || bill1.fileName ? 'cursor-not-allowed opacity-50' : ''}`}>
                    <Button type="button" variant="outline" className="w-full" asChild disabled={isBill1PdfUploadDisabled || !!bill1.fileName}>
                      <span><UploadCloud className="mr-2 h-4 w-4" /> {bill1.fileName ? 'PDF Selected' : 'Upload Senate Version PDF'}</span>
                    </Button>
                    <Input 
                      id="bill1-pdf-upload"
                      ref={bill1FileInputRef}
                      type="file" 
                      accept=".pdf" 
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, setBill1)}
                      disabled={isBill1PdfUploadDisabled || !!bill1.fileName}
                    />
                  </label>
                  {bill1.fileName && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleClearFile(setBill1, bill1FileInputRef)} title="Clear Senate Version PDF" disabled={!!keyword}>
                      <XCircle className="h-5 w-5 text-destructive" />
                    </Button>
                  )}
                </div>
                {bill1.fileName && <p className="text-xs text-muted-foreground mt-1">Selected: {bill1.fileName}</p>}

                <div className="text-sm text-muted-foreground text-center my-1">OR</div>

                <Textarea
                  aria-label="Paste Senate Version Bill Text"
                  placeholder="Paste Senate Version bill text here..."
                  value={bill1.text && bill1.isPasted ? bill1.text : ''}
                  onChange={(e) => handlePastedTextChange(e, setBill1)}
                  disabled={isBill1TextareaDisabled}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Bill 2 Input Block */}
              <div className="space-y-3 p-4 border rounded-md shadow-sm bg-card">
                <h3 className="font-headline text-lg text-primary">House Version</h3>
                <Input 
                  aria-label="House Bill Congress Number"
                  placeholder="Congress Number (e.g., 19 or 19th)" 
                  value={bill2.congress} 
                  onChange={(e) => handleBillInputChange(e, 'congress', setBill2)}
                  disabled={isBill2InputDisabled}
                />
                <Input 
                  aria-label="House Bill Number"
                  placeholder="House Bill Number (e.g., HB05678, HRN-90)" 
                  value={bill2.number} 
                  onChange={(e) => handleBillInputChange(e, 'number', setBill2)}
                  disabled={isBill2InputDisabled}
                />
                {bill2.number && !bill2.file && !bill2.isPasted && !keyword && <p className="text-xs text-muted-foreground">Detected Chamber: {getChamberFromBillNumber(bill2.number)}</p>}

                <div className="text-sm text-muted-foreground text-center my-1">OR</div>

                <div className="flex items-center space-x-2">
                  <label htmlFor="bill2-pdf-upload" className={`flex-grow ${isBill2PdfUploadDisabled || bill2.fileName ? 'cursor-not-allowed opacity-50' : ''}`}>
                    <Button type="button" variant="outline" className="w-full" asChild disabled={isBill2PdfUploadDisabled || !!bill2.fileName}>
                       <span><UploadCloud className="mr-2 h-4 w-4" /> {bill2.fileName ? 'PDF Selected' : 'Upload House Version PDF'}</span>
                    </Button>
                    <Input 
                      id="bill2-pdf-upload"
                      ref={bill2FileInputRef}
                      type="file" 
                      accept=".pdf" 
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, setBill2)}
                      disabled={isBill2PdfUploadDisabled || !!bill2.fileName}
                    />
                  </label>
                  {bill2.fileName && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleClearFile(setBill2, bill2FileInputRef)} title="Clear House Version PDF" disabled={!!keyword}>
                      <XCircle className="h-5 w-5 text-destructive" />
                    </Button>
                  )}
                </div>
                {bill2.fileName && <p className="text-xs text-muted-foreground mt-1">Selected: {bill2.fileName}</p>}
                 <div className="text-sm text-muted-foreground text-center my-1">OR</div>
                <Textarea
                  aria-label="Paste House Version Bill Text"
                  placeholder="Paste House Version bill text here..."
                  value={bill2.text && bill2.isPasted ? bill2.text : ''}
                  onChange={(e) => handlePastedTextChange(e, setBill2)}
                  disabled={isBill2TextareaDisabled}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
            <div className="space-y-3 p-4 border rounded-md shadow-sm bg-card">
                <h3 className="font-headline text-lg text-primary flex items-center"><Search className="mr-2" />Or Search by Keyword</h3>
                <Input 
                  aria-label="Keyword search"
                  placeholder="Enter keywords (e.g., 'data privacy resolution')" 
                  value={keyword} 
                  onChange={handleKeywordChange}
                  disabled={isKeywordSearchDisabled} 
                />
                <p className="text-xs text-muted-foreground">If keyword is used, Senate Version Congress/Number (if entered) provide context. House Version, PDF uploads, and pasted text will be ignored. Keyword search performs a simple summary.</p>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full md:w-auto bg-accent text-accent-foreground hover:bg-accent/90 text-base py-3 px-6 rounded-md shadow-md transition-transform hover:scale-105">
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Scale className="mr-2 h-5 w-5" />}
              Process Bills
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex flex-col justify-center items-center my-12 p-8 bg-card rounded-lg shadow-md">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-xl font-headline font-semibold text-primary">Analyzing Bills...</p>
          <p className="text-muted-foreground">This may take a few moments. Fetching and processing bill text.</p>
        </div>
      )}

      {detailedAnalysisResult && !isLoading && (
        <Card className="mt-8 shadow-lg rounded-lg overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="font-headline text-2xl text-primary flex items-center">
              <ListChecks className="mr-3 text-accent" /> Detailed SEC Regulatory Analysis
            </CardTitle>
            <CardDescription>
              Comprehensive analysis for: {detailedAnalysisResult.part1BillIdentification.fullTitle || bill1.title || "Selected Bill"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Accordion type="multiple" defaultValue={['part1', 'part2']} className="w-full">
              <AccordionItem value="part1">
                <AccordionTrigger className="font-headline text-lg hover:text-accent">Part 1: Bill Identification</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-3">
                  <div><strong>Full Title:</strong> {renderArrayOrString(detailedAnalysisResult.part1BillIdentification.fullTitle)}</div>
                  <div>
                    <strong>Bill Number:</strong>
                    {(() => {
                        const { billNumber: idBillNumber, legislativeChamber: idLegislativeChamber } = detailedAnalysisResult.part1BillIdentification;
                        const congressInput = bill1.congress; 
                        const billLink = generateBillLink(idBillNumber, idLegislativeChamber, congressInput, idBillNumber);
                        
                        return billLink ? (
                          <a href={billLink} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline ml-1">
                            {idBillNumber || 'N/A'} <LinkIcon className="inline-block h-3 w-3 ml-0.5 align-baseline" />
                          </a>
                        ) : (
                          <span className="ml-1">{idBillNumber || 'N/A'}</span>
                        );
                    })()}
                  </div>
                  <div><strong>Legislative Chamber:</strong> {renderArrayOrString(detailedAnalysisResult.part1BillIdentification.legislativeChamber)}</div>
                  <div><strong>Primary Sponsor(s):</strong> {renderArrayOrString(detailedAnalysisResult.part1BillIdentification.primarySponsors)}</div>
                  <div><strong>Date of Introduction:</strong> {renderArrayOrString(detailedAnalysisResult.part1BillIdentification.dateOfIntroduction)}</div>
                  <div><strong>Current Status:</strong> {renderArrayOrString(detailedAnalysisResult.part1BillIdentification.currentStatus)}</div>
                  <div><strong>Related/Companion Bills:</strong> {renderArrayOrString(detailedAnalysisResult.part1BillIdentification.relatedBills)}</div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="part2">
                <AccordionTrigger className="font-headline text-lg hover:text-accent">Part 2: Executive Summary</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-md text-primary">Main Objectives & Key Provisions:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part2ExecutiveSummary.mainObjectivesAndKeyProvisions)}
                  <h4 className="font-semibold text-md text-primary mt-2">Significant Changes/New Mechanisms (3-5):</h4>
                  {renderArrayOrString(detailedAnalysisResult.part2ExecutiveSummary.significantChangesOrNewMechanisms)}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="part3">
                <AccordionTrigger className="font-headline text-lg hover:text-accent">Part 3: Regulatory Impact & SEC Relations</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-md text-primary">Provisions Affecting SEC:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part3RegulatoryImpactAndSECRelations.provisionsAffectingSEC)}
                  <h4 className="font-semibold text-md text-primary mt-2">Impacted Laws & Regulations:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part3RegulatoryImpactAndSECRelations.impactedLawsAndRegulations)}
                  <h4 className="font-semibold text-md text-primary mt-2">New SEC Regulatory Obligations:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part3RegulatoryImpactAndSECRelations.newSECRegulatoryObligations)}
                  <h4 className="font-semibold text-md text-primary mt-2">Conflicts with SRC & SEC Laws:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part3RegulatoryImpactAndSECRelations.conflictsWithSRCAndSECLaws)}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="part4">
                <AccordionTrigger className="font-headline text-lg hover:text-accent">Part 4: Legal & Constitutional Analysis</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-md text-primary">Potential Legal/Constitutional Issues:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part4LegalAndConstitutionalAnalysis.potentialLegalOrConstitutionalIssues)}
                  <h4 className="font-semibold text-md text-primary mt-2">Language Clarity & Ambiguities:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part4LegalAndConstitutionalAnalysis.languageClarityAndAmbiguities)}
                  <h4 className="font-semibold text-md text-primary mt-2">Sunset Provisions, Accountability, Reporting:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part4LegalAndConstitutionalAnalysis.sunsetProvisionsAccountabilityAndReporting)}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="part5">
                <AccordionTrigger className="font-headline text-lg hover:text-accent">Part 5: Stakeholder Impact</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-md text-primary">Affected Sectors/Industries/Groups:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part5StakeholderImpact.affectedSectorsIndustriesGroups)}
                  <h4 className="font-semibold text-md text-primary mt-2">Potential Benefits or Disadvantages:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part5StakeholderImpact.potentialBenefitsOrDisadvantages)}
                  <h4 className="font-semibold text-md text-primary mt-2">Compliance Burdens/Regulatory Risks:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part5StakeholderImpact.complianceBurdensOrRegulatoryRisks)}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="part6">
                <AccordionTrigger className="font-headline text-lg hover:text-accent">Part 6: Governance & Enforcement</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-md text-primary">Shift in Regulatory Powers:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part6GovernanceAndEnforcement.shiftInRegulatoryPowers)}
                  <h4 className="font-semibold text-md text-primary mt-2">Avenues for Arbitrage, Abuse, Unintended Consequences:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part6GovernanceAndEnforcement.avenuesForArbitrageAbuseUnintendedConsequences)}
                  <h4 className="font-semibold text-md text-primary mt-2">Adequacy of Enforcement, Penalties, Dispute Resolution:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part6GovernanceAndEnforcement.adequacyOfEnforcementPenaltiesDisputeResolution)}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="part7">
                <AccordionTrigger className="font-headline text-lg hover:text-accent">Part 7: Recommendations & Further Questions</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-md text-primary">Key Questions for SEC Investigation (3-5):</h4>
                  {renderArrayOrString(detailedAnalysisResult.part7RecommendationsAndFurtherQuestions.keyQuestionsForSECInvestigation)}
                  <h4 className="font-semibold text-md text-primary mt-2">Process Irregularities, Urgent Issues, Expert Perspectives:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part7RecommendationsAndFurtherQuestions.processIrregularitiesUrgentIssuesExpertPerspectives)}
                  <h4 className="font-semibold text-md text-primary mt-2">Precedents, Historical Context, International Practices:</h4>
                  {renderArrayOrString(detailedAnalysisResult.part7RecommendationsAndFurtherQuestions.precedentsHistoricalContextInternationalPractices)}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {!detailedAnalysisResult && (bill1Summary || bill2Summary || comparisonResult) && !isLoading && (
        <Tabs defaultValue="summaries" className="w-full mt-8">
           <TabsList className={`grid w-full ${comparisonResult && !keyword ? 'grid-cols-1 sm:grid-cols-3' : (bill1Summary && bill2Summary && !keyword ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')} mb-6 rounded-lg bg-primary/5 p-1`}>
            <TabsTrigger value="summaries" className="py-2.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md rounded-md">Bill Summaries</TabsTrigger>
            {comparisonResult && !keyword && <TabsTrigger value="comparison" className="py-2.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md rounded-md">Comparison Analysis</TabsTrigger>}
            {comparisonResult && !keyword && <TabsTrigger value="comments" className="py-2.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md rounded-md">SEC Comments</TabsTrigger>}
          </TabsList>

          <TabsContent value="summaries" className="mt-0">
            <div className={`grid ${bill1Summary && bill2Summary && !keyword ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
              {bill1Summary && (
                <Card className="shadow-lg rounded-lg overflow-hidden">
                  <CardHeader className="bg-primary/5">
                    <CardTitle className="font-headline text-xl text-primary">{bill1.title || "Senate Version Details"}</CardTitle>
                    <CardDescription>
                        Source: {bill1.file ? `Uploaded PDF (${bill1.fileName}) - Content Simulated` 
                                : bill1.isPasted ? "Pasted Text" 
                                : (bill1.chamber && bill1.chamber !== 'N/A') ? `${bill1.chamber} Bill ${bill1.number} (${bill1.congress})`
                                : keyword ? "Keyword Search Result"
                                : "Manual Input (Simulated Text)"}
                        {(!bill1.file && !bill1.isPasted && bill1.text && !keyword) && " (Full text available to AI)"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ScrollArea className="h-[250px] pr-3">
                      <p className="whitespace-pre-wrap leading-relaxed">{bill1Summary.summary}</p>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
              {bill2Summary && !keyword && ( 
                <Card className="shadow-lg rounded-lg overflow-hidden">
                  <CardHeader className="bg-primary/5">
                    <CardTitle className="font-headline text-xl text-primary">{bill2.title || "House Version Details"}</CardTitle>
                     <CardDescription>
                        Source: {bill2.file ? `Uploaded PDF (${bill2.fileName}) - Content Simulated` 
                                : bill2.isPasted ? "Pasted Text" 
                                : (bill2.chamber && bill2.chamber !== 'N/A') ? `${bill2.chamber} Bill ${bill2.number} (${bill2.congress})`
                                : "Manual Input (Simulated Text)"}
                        {(!bill2.file && !bill2.isPasted && bill2.text) && " (Full text available to AI)"}
                     </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ScrollArea className="h-[250px] pr-3">
                      <p className="whitespace-pre-wrap leading-relaxed">{bill2Summary.summary}</p>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
             {(!bill1Summary && !bill2Summary && !keyword && !detailedAnalysisResult) && <p className="text-center text-muted-foreground py-10 text-lg">No summaries to display. Please process bills first.</p>}
             {(keyword && !bill1Summary && !detailedAnalysisResult) && <p className="text-center text-muted-foreground py-10 text-lg">No summary for keyword search. Please process bills first.</p>}
          </TabsContent>

          {comparisonResult && !keyword && ( 
            <TabsContent value="comparison" className="mt-0">
              <Card className="shadow-lg rounded-lg overflow-hidden">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="font-headline text-xl text-primary flex items-center"><Users className="mr-3" />Bill Comparison Details</CardTitle>
                   <CardDescription>
                    Comparing {bill1.title || "Senate Version"} {(bill1.file ? '(PDF)' : bill1.isPasted ? '(Pasted)' : (!keyword && bill1.chamber && bill1.chamber !== 'N/A') ? `(${bill1.chamber})` : '')} 
                    with {bill2.title || "House Version"} {(bill2.file ? '(PDF)' : bill2.isPasted ? '(Pasted)' : (!keyword && bill2.chamber && bill2.chamber !== 'N/A') ? `(${bill2.chamber})` : '')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div>
                        <h3 className="font-headline text-lg text-primary mb-2">Similarities</h3>
                        <ScrollArea className="h-[180px] p-4 border rounded-md bg-secondary/50 shadow-inner">
                            <p className="whitespace-pre-wrap leading-relaxed">{comparisonResult.similarities}</p>
                        </ScrollArea>
                    </div>
                    <div>
                        <h3 className="font-headline text-lg text-primary mb-2">Differences</h3>
                        <ScrollArea className="h-[180px] p-4 border rounded-md bg-secondary/50 shadow-inner">
                            <p className="whitespace-pre-wrap leading-relaxed">{comparisonResult.differences}</p>
                        </ScrollArea>
                    </div>
                    <div>
                        <h3 className="font-headline text-lg text-primary mb-2">Potential Conflicts</h3>
                        <ScrollArea className="h-[180px] p-4 border rounded-md bg-secondary/50 shadow-inner">
                            <p className="whitespace-pre-wrap leading-relaxed">{comparisonResult.potentialConflicts}</p>
                        </ScrollArea>
                    </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {comparisonResult && !keyword && ( 
            <TabsContent value="comments" className="mt-0">
                <Card className="shadow-lg rounded-lg overflow-hidden">
                    <CardHeader className="bg-primary/5">
                        <CardTitle className="font-headline text-xl text-primary flex items-center"><Edit3 className="mr-3" />Draft SEC Comments</CardTitle>
                        <CardDescription>Review, edit, and export draft comments regarding potential SEC regulatory impact.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                        {comparisonResult.regulatoryImpactAssessmentBill1 && (
                            <div>
                                <h3 className="font-headline text-lg text-primary mb-2">Comment for {bill1.title || "Senate Version"} {(bill1.file ? '(PDF)' : bill1.isPasted ? '(Pasted)' : (!keyword && bill1.chamber && bill1.chamber !== 'N/A') ? `(${bill1.chamber})` : '')}</h3>
                                <Textarea 
                                    aria-label={`Comment for ${bill1.title || "Senate Version"}`}
                                    value={editableCommentBill1} 
                                    onChange={(e) => setEditableCommentBill1(e.target.value)}
                                    rows={10}
                                    className="shadow-sm text-base"
                                />
                                <Button onClick={() => handleExportComment(editableCommentBill1, bill1.title || "Senate_Version")} variant="outline" className="mt-3 border-accent text-accent hover:bg-accent/10">
                                    <Download className="mr-2 h-4 w-4" /> Export Comment for {bill1.title || "Senate Version"}
                                </Button>
                            </div>
                        )}
                        {comparisonResult.regulatoryImpactAssessmentBill2 && (
                            <div>
                                <h3 className="font-headline text-lg text-primary mb-2">Comment for {bill2.title || "House Version"} {(bill2.file ? '(PDF)' : bill2.isPasted ? '(Pasted)' : (!keyword && bill2.chamber && bill2.chamber !== 'N/A') ? `(${bill2.chamber})` : '')}</h3>
                                <Textarea 
                                    aria-label={`Comment for ${bill2.title || "House Version"}`}
                                    value={editableCommentBill2} 
                                    onChange={(e) => setEditableCommentBill2(e.target.value)}
                                    rows={10}
                                    className="shadow-sm text-base"
                                />
                                <Button onClick={() => handleExportComment(editableCommentBill2, bill2.title || "House_Version")} variant="outline" className="mt-3 border-accent text-accent hover:bg-accent/10">
                                    <Download className="mr-2 h-4 w-4" /> Export Comment for {bill2.title || "House Version"}
                                </Button>
                            </div>
                        )}
                        {!comparisonResult.regulatoryImpactAssessmentBill1 && !comparisonResult.regulatoryImpactAssessmentBill2 && (
                             <p className="text-center text-muted-foreground py-10 text-lg">No specific SEC comments generated from this comparison.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

