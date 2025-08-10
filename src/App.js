import React, { useState } from "react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import "bootstrap/dist/css/bootstrap.min.css";
import { Container, Row, Col, Card, Button, Table } from "react-bootstrap";

function App() {
  const [rows, setRows] = useState([]);

  const exportImage = (index) => {
    const card = document.getElementById(`card-${index}`);
    html2canvas(card).then(canvas => {
      canvas.toBlob(blob => saveAs(blob, `card-${index+1}.png`));
    });
  };

  const exportAllImages = () => {
    rows.forEach((_, i) => exportImage(i));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array", cellDates: true });

      if (workbook.SheetNames.length < 2) {
        alert("File must contain 2 sheets");
        return;
      }

      // Process Sheet1 (Product Description, Quantity)
      const sheet1 = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      // Process Sheet2 (Product Name, Manufacturer, Origin, Date)
      const sheet2 = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[1]]);

      // Create a mapping of product names to manufacturer data for quick lookup
      const manufacturerData = {};
      sheet2.forEach(item => {
        const productName = item["Product Name"] || item["product name"];
        if (productName) {
          manufacturerData[productName] = {
            manufacturer: item["Manufacturer "] || item["manufacturer "],
            origin: item["Origin"] || item["origin"] || "Made in China",
            date: item["Date"] || item["date"]
          };
        }
      });

      // Merge data from both sheets
      const mergedData = sheet1.map(item => {
        const productName = item["Product Description"] || item["product description"] || 
                           item["Product Name"] || item["product name"];
        
        const manufacturerInfo = manufacturerData[productName] || {};
        
        return {
          productName: productName || "-",
          manufacturer: manufacturerInfo.manufacturer || "-",
          origin: manufacturerInfo.origin || "Made in China",
          quantity: item["Quantity"] || item["quantity"] || "-",
          date: formatDate(manufacturerInfo.date)
        };
      });

      setRows(mergedData);
    };

    reader.readAsArrayBuffer(file);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return new Date().toLocaleDateString();
    
    if (dateValue instanceof Date) return dateValue.toLocaleDateString();
    if (typeof dateValue === 'string') {
      const datePart = dateValue.split(' ')[0];
      const dateObj = new Date(datePart);
      return isNaN(dateObj.getTime()) ? new Date().toLocaleDateString() : dateObj.toLocaleDateString();
    }
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

      {rows.length > 0 && (
        <>
          <div className="text-center mb-4">
            <Button variant="success" onClick={exportAllImages}>
              Export All as Images
            </Button>
          </div>

          <Row>
            {rows.map((row, i) => (
              <Col md={4} sm={6} xs={12} key={i} className="mb-4">
                <Card className="shadow">
                  <Card.Body id={`card-${i}`}>
                    <Table bordered size="sm" className="mb-0 text-center">
                      <thead className="table-light">
                        <tr>
                          <th colSpan="2">Material Identification</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Product</td>
                          <td>{row.productName}</td>
                        </tr>
                        <tr>
                          <td>Manufacturer</td>
                          <td>{row.manufacturer}</td>
                        </tr>
                        <tr>
                          <td>Origin</td>
                          <td>{row.origin}</td>
                        </tr>
                        <tr>
                          <td>Quantity</td>
                          <td>{row.quantity} {row.quantity !== "-" && "pcs"}</td>
                        </tr>
                        <tr>
                          <td>Date</td>
                          <td>{row.date}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                  <Card.Footer className="text-center">
                    <Button variant="primary" size="sm" onClick={() => exportImage(i)}>
                      Export Card
                    </Button>
                  </Card.Footer>
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