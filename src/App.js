import React, { useState } from "react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import "bootstrap/dist/css/bootstrap.min.css";
import { Container, Row, Col, Card, Button, Table, Spinner, ProgressBar, Alert } from "react-bootstrap";

function App() {
  const [rows, setRows] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);

  const exportImage = async (index) => {
    const card = document.getElementById(`card-${index}`);
    const canvas = await html2canvas(card, {
      scale: 0.9, // توازن بين الجودة والأداء
      useCORS: true,
      logging: false,
      allowTaint: true
    });
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        resolve({
          blob,
          filename: `material-card-${index + 1}.png`
        });
      }, 'image/png', 0.8); // ضغط الصورة بنسبة 80%
    });
  };

  const exportAllImages = async () => {
    setIsExporting(true);
    setExportComplete(false);
    setProgress(0);
    
    try {
      const zip = new JSZip();
      const folder = zip.folder("material-cards");
      const batchSize = 10; // تصدير 10 بطاقات في كل دفعة
      const totalBatches = Math.ceil(rows.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * batchSize;
        const end = Math.min(start + batchSize, rows.length);
        
        const batchPromises = [];
        for (let i = start; i < end; i++) {
          batchPromises.push(exportImage(i));
        }

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ blob, filename }) => {
          folder.file(filename, blob);
        });

        setProgress(Math.round((end / rows.length) * 100));
      }

      const content = await zip.generateAsync(
        { type: "blob" },
        (metadata) => {
          setProgress(metadata.percent.toFixed(0));
        }
      );

      saveAs(content, "material-cards.zip");
      setExportComplete(true);
      
      // إخفاء التنبيه بعد 5 ثوان
      setTimeout(() => setExportComplete(false), 5000);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array", cellDates: true });

      // معالجة الورقة الأولى فقط
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

      const processedData = sheet.map(item => ({
        productName: item["Product Name"] || "-",
        manufacturer: item["Manufacturer "] || "-",
        origin: item["Origin"] || "Made in China",
        quantity: item["Quantity"] || "-",
        date: formatDate(item["Date"])
      }));

      setRows(processedData);
    };

    reader.readAsArrayBuffer(file);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return new Date().toLocaleDateString();
    if (dateValue instanceof Date) return dateValue.toLocaleDateString();
    if (typeof dateValue === 'string') return dateValue.split('T')[0];
    if (typeof dateValue === 'number') {
      return new Date((dateValue - 25569) * 86400 * 1000).toLocaleDateString();
    }
    return new Date().toLocaleDateString();
  };

  return (
    <Container className="mt-4">
      <h2 className="text-center mb-4">📦 Material Identification Cards</h2>
      
      <div className="text-center mb-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          className="form-control w-50 mx-auto"
          onChange={handleFileUpload}
        />
      </div>

      {exportComplete && (
        <Alert variant="success" className="text-center" dismissible onClose={() => setExportComplete(false)}>
          Export completed successfully!
        </Alert>
      )}

      {rows.length > 0 && (
        <>
          <div className="text-center mb-4">
            <Button 
              variant="success" 
              onClick={exportAllImages}
              disabled={isExporting}
              className="mb-3"
            >
              {isExporting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />
                  <span className="ms-2">Exporting...</span>
                </>
              ) : "Export All as ZIP"}
            </Button>
            
            {isExporting && (
              <div className="w-50 mx-auto">
                <ProgressBar now={progress} label={`${progress}%`} />
                <small>Processing {progress}% of {rows.length} cards</small>
              </div>
            )}
          </div>

          <Row>
            {rows.map((row, i) => (
              <Col md={4} sm={6} xs={12} key={i} className="mb-4">
                <Card className="shadow-sm">
                  <Card.Body id={`card-${i}`} className="p-3">
                    <Table bordered size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th colSpan="2" className="text-center">Material Card</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="fw-bold">Product</td>
                          <td>{row.productName}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Manufacturer</td>
                          <td>{row.manufacturer}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Origin</td>
                          <td>{row.origin}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Quantity</td>
                          <td>
                            {row.quantity} 
                            {!row.quantity.toString().includes(' ') && ' pcs'}
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Date</td>
                          <td>{row.date}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}
    </Container>
  );
}

export default App;