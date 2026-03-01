import { useState, useRef } from "react";
import axios from "axios";
import {
  UploadCloud,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BookOpen,
  Download,
} from "lucide-react";
import { jsPDF } from "jspdf";
import "./index.css";

function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [faqLimit, setFaqLimit] = useState(5);

  const fileInputRef = useRef(null);

  const upload = async () => {
    if (!file) return;
    setIsLoading(true);
    setExpandedId(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("limit", faqLimit);

    try {
      const res = await axios.post("http://localhost:8000/upload", formData);
      setData(res.data.results || []);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const parseFAQ = (rawText) => {
    try {
      // Find the first '[' and last ']' to extract just the array
      const startIdx = rawText.indexOf("[");
      const endIdx = rawText.lastIndexOf("]");

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonStr = rawText.substring(startIdx, endIdx + 1);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          return parsed.map((p) => ({
            question: p.question || "Generated Question",
            answer: p.answer || "",
          }));
        }
      }
    } catch (e) {
      console.error("Failed to parse JSON FAQ:", e);
    }

    const lines = rawText.split("\n").filter((l) => l.trim() !== "");
    const q =
      lines.find((l) => l.startsWith("Q:") || l.startsWith("Question:")) ||
      "Generated Question";
    const aLines = lines.filter(
      (l) => !l.startsWith("Q:") && !l.startsWith("Question:"),
    );
    return [
      {
        question: q.replace(/^Q:\s*/, "").replace(/^Question:\s*/, ""),
        answer: aLines
          .join("\n")
          .replace(/^A:\s*/, "")
          .replace(/^Answer:\s*/, ""),
      },
    ];
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxLineWidth = pageWidth - margin * 2;
    let yPos = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Generated FAQs", margin, yPos);
    yPos += 15;

    // Flatten logic
    const allFaqs = data.flatMap((item) => parseFAQ(item.faqs));
    // Enforce raw exact user limit constraint overall
    const finalFaqs = allFaqs.slice(0, faqLimit);

    finalFaqs.forEach((faq, index) => {
      // Question Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      const qText = `Q${index + 1}: ${faq.question}`;
      const qLines = doc.splitTextToSize(qText, maxLineWidth);

      qLines.forEach((line) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += 7;
      });

      yPos += 3;

      // Answer content
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      const answerParas = faq.answer.split("\n\n");
      answerParas.forEach((para) => {
        const aLines = doc.splitTextToSize(
          para.replace(/\n/g, " "),
          maxLineWidth,
        );
        aLines.forEach((line) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, margin, yPos);
          yPos += 6;
        });
        yPos += 3;
      });

      yPos += 8; // Extra space betweeen exact Q/A cycles
    });

    doc.save(`${file?.name || "Document"}_Clean_FAQs.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            AI FAQ Builder
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Upload your documents and let our AI generate accurate,
            citation-backed FAQs in seconds.
          </p>
        </div>

        {/* Upload Card */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-10 animate-fade-in"
          style={{ animationDelay: "100ms" }}
        >
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all duration-200 ease-in-out
              ${file ? "border-gray-900 bg-gray-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"}`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
            />
            {file ? (
              <CheckCircle2 className="w-12 h-12 text-gray-900 mb-4" />
            ) : (
              <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
            )}
            <p className="text-sm font-medium text-gray-900 mb-1">
              {file ? file.name : "Click or drag to upload"}
            </p>
            <p className="text-xs text-gray-500">
              PDF files up to 10MB
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700">
                Total FAQs limits:
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={faqLimit}
                onChange={(e) => setFaqLimit(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
              />
            </div>
            <button
              onClick={upload}
              disabled={!file || isLoading}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "Generate FAQs"
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {data.length > 0 &&
          (() => {
            const allFaqs = data.flatMap((item, chunkIndex) => {
              const parsed = parseFAQ(item.faqs);
              return parsed.map((faq, faqIndex) => ({
                ...faq,
                item,
                uniqueId: `${chunkIndex}-${faqIndex}`,
              }));
            });

            // Constrain frontend UI mapping exactly to what the user requested total
            const displayedFaqs = allFaqs.slice(0, faqLimit);

            return (
              <div
                className="space-y-6 animate-fade-in"
                style={{ animationDelay: "200ms" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Generated Results
                    </h2>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      {displayedFaqs.length} FAQs
                    </span>
                  </div>

                  <button
                    onClick={exportPDF}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    title="Download clean formatted PDF without citations"
                  >
                    <Download className="w-4 h-4" /> Export clean PDF
                  </button>
                </div>

                <div className="space-y-4">
                  {displayedFaqs.map((faqData) => {
                    const { question, answer, uniqueId, item } = faqData;
                    const isExpanded = expandedId === uniqueId;

                    return (
                      <div
                        key={uniqueId}
                        className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden
                        ${isExpanded ? "border-gray-300 shadow-md ring-1 ring-gray-900/5" : "border-gray-200 shadow-sm hover:border-gray-300"}`}
                      >
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : uniqueId)
                          }
                          className="w-full px-6 py-5 flex items-start justify-between gap-4 text-left focus:outline-none"
                        >
                          <h3 className="text-lg font-semibold text-gray-900 leading-tight pr-8">
                            {question}
                          </h3>
                          <div className="shrink-0 text-gray-400 mt-1">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        </button>

                        <div
                          className={`transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}
                        >
                          <div className="px-6 pb-6 p-2">
                            <div className="border-t border-gray-100 pt-5 space-y-6">
                              <div className="text-gray-600 leading-relaxed space-y-4 text-[15px]">
                                {answer.split("\n\n").map((para, idx) => (
                                  <p key={idx}>{para}</p>
                                ))}
                              </div>

                              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 space-y-4">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                  <BookOpen className="w-4 h-4" /> Citation
                                </div>

                                <div className="flex flex-wrap gap-2 text-xs font-mono">
                                  <span className="bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-md shadow-sm">
                                    <span className="text-gray-400">Doc:</span>{" "}
                                    {item.citation.document}
                                  </span>
                                  <span className="bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-md shadow-sm">
                                    <span className="text-gray-400">Pg:</span>{" "}
                                    {item.citation.page}
                                  </span>
                                  <span className="bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-md shadow-sm">
                                    <span className="text-gray-400">ID:</span>{" "}
                                    {item.citation.chunk_id}
                                  </span>
                                </div>

                                <p className="text-sm text-gray-500 italic border-l-2 border-gray-300 pl-3">
                                  "{item.source_preview}"
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}

export default App;
