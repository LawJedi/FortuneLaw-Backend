const fs = require("fs");
const jsPDF = require("jspdf");
const autoTable = require("jspdf-autotable").default;
const path = require("path");

function twoDigit(str) {
    if (str) {
        let n = str.toString().substr(0, 2);
        if (n.length == 1) return n + "0";
        else return n;
    } else return "00"
}

module.exports = function(data, id) {
        let flags = {
            mortPlural: false,
            mortPresent: false,
            mortCount: 0
        }

        for (let i = 0; i < data.$debtTragectory.length; i++) {
            if (data.$debtTragectory[i].type == "m") {
                flags.mortPresent = true;
                flags.mortCount++;
                if (flags.mortCount > 1) flags.mortPlural = true;
            }
        }

        var doc = new jsPDF.jsPDF({ compress: true });
        let pageNum = 0;
        const $ = {
            img: function(fileName, ext) {
                var idata = fs.readFileSync(__dirname + "/assets/" + fileName + "." + ext).toString("base64");
                return `data:image/${ext};base64, ` + idata;
            },
            ctext: function(doc, text, y, opt) {
                doc.text(text, ((doc.internal.pageSize.getWidth() - doc.getTextWidth(text)) / 2), y, opt ? opt : {});
            },
            leftBound: function(doc, w) {
                return ((doc.internal.pageSize.getWidth() - 171.3) / 2)
            },
            round: function(num, prec) {
                return (Math.round(num * Math.pow(10, prec)) / Math.pow(10, prec)).toFixed(prec);
            },
            pageNumber: function() {
                let sfsize = doc.getFontSize(),
                    sfcolor = doc.getTextColor();
                doc.setTextColor("#000")
                doc.setFontSize(10);
                doc.text((++pageNum).toString(), 200, 10, {
                    align: "center",
                })
                doc.setFontSize(sfsize)
                doc.setTextColor(sfcolor)
            }
        }

        function bold() {
            doc.setFont(doc.getFont().fontName, "bold");
        }

        function normal() {
            doc.setFont(doc.getFont().fontName, "normal");
        }

        const formatter = {
            year: function(str) {
                if (str.constructor !== Array) return $.round(parseFloat(str), 1);
                return doc.splitTextToSize($.round(parseFloat(str.join("")), 1));
            },
            money: function(str) {
                if (str.constructor !== Array) {
                    if (parseFloat(str) < 0) return "$0.00";
                    let numString = parseFloat(str).toString().split(".")
                    let int = numString[0].split("");
                    let i = int.length + 1;
                    while (i > 0) {
                        if ((int.length - i) % 4 == 0) {
                            int.splice(i, 0, ",");
                        }
                        i--;
                    }
                    // return "$"+int.join("").substr(0, int.length-1) + "." + twoDigit(numString[1]);
                    return int.join("").substr(0, int.length - 1) + "." + twoDigit(numString[1]);
                } else return this.money(str.join(""))
            },
            negMoney: function(str) {
                if (!isNaN(parseFloat(str))) {
                    if (parseFloat(str) < 0) {
                        return `-${Math.abs($.round(parseFloat(str), 2))}`
                            // return `-$${Math.abs($.round(parseFloat(str), 2))}`
                    } else {
                        return this.money(str)
                    }
                }
            },
            moneyInt: function(str) {
                if (str.constructor !== Array) {
                    if (parseFloat(str) < 0) return "$0";
                    let numString = Math.round(parseFloat(str)).toString()
                    let int = numString.split("");
                    let i = int.length + 1;
                    while (i > 0) {
                        if ((int.length - i) % 4 == 0) {
                            int.splice(i, 0, ",");
                        }
                        i--;
                    }
                    return int.join("").substr(0, int.length - 1);
                    // return "$"+int.join("").substr(0, int.length-1);
                } else return this.moneyInt(str.join(""))
            },
            chartMoney: function(str) {
                if (str.constructor !== Array) {
                    if (parseFloat(str) < 0) return "$0";
                    let numString = Math.round(parseFloat(str)).toString()
                    let int = numString.split("");
                    let i = int.length + 1;
                    while (i > 0) {
                        if ((int.length - i) % 4 == 0) {
                            int.splice(i, 0, ",");
                        }
                        i--;
                    }
                    return int.join("").substr(0, int.length - 1);
                } else return this.chartMoney(str.join(""))
            },
            percent: function(str) {
                if (str.constructor !== Array) return $.round(parseFloat(str), 2) + "%";
                return doc.splitTextToSize($.round(parseFloat(str.join("")), 2) + "%");
            }
        }

        // justified text function
        var r = function(n) {
            return (Math.round(n * 100) / 100);
        }

        function justifyText(doc, text, x, y, width, wordProcessor) {
            var defaultSpace = 1.5;
            const leftMargin = x;
            const w = width;
            const wordArray = text.split(" ");

            //line manipulation properties
            let lineStartX = x;
            let lineStartY = y;
            let lineArray = [];
            let lineWordsLength = 0;

            function addLineToDoc() {
                var wordSpacing = defaultSpace; //r(w - lineWordsLength)/(lineArray.length-1);
                for (let j = 0; j < lineArray.length; j++) {
                    let startFont = doc.getFont();
                    let word = lineArray[j];
                    if (wordProcessor) {
                        if (wordProcessor.bold && lineArray[j].startsWith(wordProcessor.bold[0]) && lineArray[j].endsWith(wordProcessor.bold[1])) {
                            let trimLength = [wordProcessor.bold[0].length, wordProcessor.bold[1].length]
                            word = new String(word).substring(trimLength[0], word.length - trimLength[1]);
                            doc.setFont(startFont.fontName, "bold");
                        };
                        if (wordProcessor.italic && lineArray[j].startsWith(wordProcessor.italic[0]) && lineArray[j].endsWith(wordProcessor.italic[1])) {
                            doc.setFont(startFont.fontName, "italic");
                        }
                    }
                    let adder = 0;
                    if (doc.getFont().fontStyle == "bold") {
                        adder = -3
                    }
                    doc.text(word, lineStartX, lineStartY);
                    lineStartX += doc.getTextWidth(lineArray[j]) + wordSpacing + adder;
                    adder = 0
                    doc.setFont(startFont.fontName, startFont.fontStyle);
                }
                lineStartX = leftMargin;
                lineStartY += doc.getTextDimensions(lineArray[0] || " ").h + 1;
                lineArray = [];
                lineWordsLength = 0;
            }

            for (let i = 0; i < wordArray.length; i++) {
                let word = wordArray[i];
                let wordWidth = doc.getTextWidth(word);
                if (x + wordWidth + defaultSpace < w) {
                    x += wordWidth + defaultSpace;
                    lineWordsLength += wordWidth;
                    lineArray.push(word);
                } else {
                    // process adding of line to document
                    addLineToDoc();
                    x = leftMargin;
                    i--;
                }
            }
            if (lineArray.length != 0) doc.text(lineArray.join(" "), leftMargin, lineStartY);
        }

        function detailHeader() {
            doc.addImage($.img("logo", "png"), 5, 6, 15.05, 20);
            doc.setFontSize(10);
            normal();
            doc.setTextColor("#000");
            doc.text("Debtor: ", 25, 10);
            doc.text("Years to be saved:", 25, 15);
            doc.text("Interest to be saved:", 25, 20);
            doc.text(`Cash in plan after ${formatter.year(data.$debtyearsc)} years: `, 25, 25);

            bold()
            doc.text(`${data.$first} ${data.$last}`, 38, 10);
            doc.text(formatter.year(data.$yearssaved), 56, 15);
            doc.text(formatter.moneyInt(data.$interestsaved), 59, 20);
            doc.text(formatter.moneyInt(data.$liquidityc), 72, 25);

            doc.setFillColor("#e3e9ec");
            doc.rect(0, 30, doc.internal.pageSize.width, doc.internal.pageSize.height - 30, "f")
        }

        function footer() {
            doc.setFontSize(10);
            doc.setFillColor("#2f4e6f");
            doc.rect(0, doc.internal.pageSize.height - 20, doc.internal.pageSize.width, 20, "f");
            normal();
            var textCol = doc.getTextColor();
            doc.setTextColor("#fff");
            doc.text(`© ${new Date().getFullYear()} The Fortune Law Firm`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 12, {
                align: "center"
            })
            doc.text("G.O.L.D.E.N. - Growth over Life in Debt. Earn Now.", doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 7, {
                align: "center"
            })
            doc.setTextColor(textCol)
        }

        //first page
        doc.addImage($.img("first_page_bg", "jpg"), 0, 0, 210, 300);
        // bottom left text
        doc.setTextColor("#fff");
        doc.setFontSize(18);
        doc.text("If You're a Slave to Your Debt", 15, 255);
        doc.setTextColor("#ee7e12");
        doc.text("Get G.O.L.D.E.N.", 15, 262);
        doc.setTextColor("#fff");
        doc.setFontSize(12);
        doc.setFont("Helvetica", "normal");
        doc.text("Growth Over Life-in-Debt. Earn Now.", 15, 275);

        // bottom right text
        doc.setTextColor("#ee7e12");
        doc.setFontSize(14);
        doc.text("Prepared for", 125, 248);
        doc.text("By", 125, 265);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor("#fff");
        doc.setFontSize(16);
        doc.text((data.$first + " " + data.$last).toUpperCase() || "{$first} {$last}", 125, 255);
        doc.setFontSize(12)
        doc.text((data.$agent) || "{$agent}", 125, 272);
        doc.setFont("Helvetica", "normal");
        doc.text("Fortune Law Firm Authorized Affiliate", 125, 278);
        doc.text((data.$date || "{$data}"), 125, 284);

        $.pageNumber();

        // disclosure page
        doc.addPage();
        doc.setTextColor("#000");
        doc.setFontSize(18);
        doc.setFont("Helvetica", "bold");
        doc.text("Disclosure of Assumptions and Disclaimer", doc.internal.pageSize.getWidth() / 2, 40, {
            align: "center"
        })
        doc.setDrawColor("#fff")
        doc.addImage($.img("disclaimer", "png"), 15, 50, 180, 165.2)

        $.pageNumber();

        // working page
        doc.addPage()
        doc.setTextColor("#000");
        doc.setFontSize(18);
        doc.setFont("Helvetica", "bold");
        doc.text("How Does the G.O.L.D.E.N. Program Work ?", doc.internal.pageSize.getWidth() / 2, 40, {
            align: "center"
        })
        doc.addImage($.img("working1", "png"), 15, 50, 180, 188.66);
        $.pageNumber()


        doc.addPage()
        $.pageNumber()
        doc.addImage($.img("working 2_1", "png"), 15, 25, 180, 142.1);
        doc.addImage($.img("working 1_2", "png"), 14, 234, 180, 38.25);


        doc.addPage();
        $.pageNumber()
        doc.addImage($.img("working3", "png"), 15, 25, 180, 72.34);
        doc.addImage($.img("Working 2_2", "png"), 16, 165, 180, 100);

        // current debt trajectory
        doc.addPage();
        detailHeader();

        doc.setFontSize(26);
        normal()
        doc.text("YOUR CURRENT", 25, 45);
        doc.setTextColor("#2f4e6f");
        bold();
        doc.text("DEBT", 25, 57);
        doc.setTextColor("#000");
        doc.text("TRAJECTORY", 54, 57);

        let tablePage6 = [
            ["", "Without Mortgage", "With Mortgage"],
            ["Total Debt Balance:", formatter.money(data.$debtbalancenm), formatter.money(data.$debtbalance)],
            ["Total Number of Years to Repay Debt:", formatter.year(data.$debtyearscnm), formatter.year(data.$debtyearsc)],
            ["When You Will Be Debt-Free:", data.$debtfreedatecnm, data.$debtfreedatec],
            ["Total Cost of the Debt (Interest):", formatter.money(data.$interestcnm), formatter.money(data.$interestc)],
            ["Amount You Will Pay to Eliminate Debt:", formatter.money(data.$totalrealdebtcnm), formatter.money(data.$totalrealdebtc)]
        ];
        if (!flags.mortPresent) {
            tablePage6.map(arr => {
                return arr.splice(2, 1);
            })
            tablePage6[0][1] = "Current"
        }

        autoTable(doc, {
            tableWidth: 170,
            margin: {
                left: 25,
                bottom: 50,
            },
            startY: 75,
            theme: "striped",
            body: tablePage6,
            bodyStyles: {
                fontSize: 12,
                cellPadding: {
                    vertical: 2,
                    horizontal: 3
                }
            },
            columnStyles: {
                0: {
                    cellWidth: 90,
                    textColor: "#464e6f"
                },
                1: {
                    fontStyle: "bold",
                    // halign: "right",
                    textColor: "#2f4e6f"
                },
                2: {
                    fontStyle: "bold",
                    halign: "right",
                    textColor: "#2f4e6f"
                }
            },
            didParseCell: function(cellData) {
                if (cellData.row.index == 0) {
                    switch (cellData.column.index) {
                        case 0:
                            {
                                cellData.cell.styles.fillColor = "#e3e9ec";
                                break;
                            }
                        case 1:
                        case 2:
                            {
                                cellData.cell.styles.fillColor = "#e15119";
                                cellData.cell.styles.textColor = "#fff";
                                cellData.cell.styles.fontStyle = "normal"
                                cellData.cell.styles.halign = "center"
                                break;
                            }
                    }
                } else {
                    if (cellData.row.index % 2 == 1) {
                        cellData.cell.styles.fillColor = "#c8d7e3"
                    }
                }
            }
        })

        doc.setFillColor("#fff");
        doc.rect(135, 140, 60, 35, "f");
        doc.setFontSize(14);
        doc.setTextColor("#2f4e6f");
        normal();
        doc.text(["On average,", "", "", "of each of your debt", "payment goes to interest!"], 193, 142, {
            align: "right",
            baseline: "top",
            lineHeightFactor: 1.2
        })
        doc.setTextColor("#e15119");
        bold();
        doc.setFontSize(25);
        doc.text(formatter.percent(data.$realinterestc), 193, 149, {
            baseline: "top",
            align: "right"
        })

        doc.setFontSize(18);
        normal()
        doc.setTextColor("#000")
        doc.text("CURRENT DEBT-BY-DEBT", 25, 162);
        doc.setTextColor("#2f4e6f");
        bold()
        doc.text("REPAYMENT", 25, 170);
        doc.setTextColor("#000");
        doc.text("PLAN", 68, 170)

        autoTable(doc, {
            startY: 180,
            tableWidth: 170,
            margin: {
                left: 25,
            },
            theme: "striped",
            body: [...data.$debtTragectory, { name: "Total", balance: data.$debtbalance, interestc: data.$interestc, yearsc: data.$debtyearsc, real: data.$totalrealdebtc }],
            columnStyles: {
                0: { halign: "left", minCellWidth: 30 },
                1: { halign: "right", minCellWidth: 25 },
                2: { halign: "right" },
                3: { halign: "right" },
                4: { halign: "right", minCellWidth: 20 },
                5: { halign: "right", minCellWidth: 30 },
                6: { halign: "right" }
            },
            alternateRowStyles: {
                fillColor: "#c8d7e3"
            },
            headStyles: {
                fontSize: 8,
                fontStyle: "bold",
                halign: "center",
                valign: "middle",
                fillColor: "#e15119",
                textColor: "white"
            },
            bodyStyles: {
                valign: "middle",
                fontSize: 8,
                cellPadding: {
                    vertical: 1,
                    horizontal: 1
                }
            },
            columns: [{
                header: "Name",
                dataKey: "name"
            }, {
                header: "Balance",
                dataKey: "balance"
            }, {
                header: "Interest Rate",
                dataKey: "IR"
            }, {
                header: "Monthly Payment",
                dataKey: "actpay"
            }, {
                header: "Total Interest Over Life of Debt",
                dataKey: "interestc"
            }, {
                header: "Total Life of Debt (years)",
                dataKey: "yearsc"
            }, {
                header: "Total Debt Payoff",
                dataKey: "real"
            }],
            didDrawPage: $.pageNumber,
            didParseCell: function(cellData) {
                if (cellData.section !== "head") {
                    switch (cellData.column.index) {
                        case 1:
                        case 3:
                        case 4:
                        case 6:
                            {
                                cellData.cell.text = formatter.money(cellData.cell.text);
                                break;
                            }
                        case 2:
                            {
                                if (isNaN(parseFloat(cellData.cell.text.join("")))) break;
                                cellData.cell.text = formatter.percent(cellData.cell.text);
                                break;
                            }
                        case 5:
                            {
                                cellData.cell.text = formatter.year(cellData.cell.text);
                                break;
                            }
                    }
                }
                if (cellData.row.index == data.$debtTragectory.length) {
                    if (cellData.column.index == 3) {
                        cellData.cell.text = "";
                    }
                    cellData.cell.styles.fontStyle = "bold";
                    cellData.cell.styles.fillColor = "#e15119";
                    cellData.cell.styles.textColor = "#fff";
                }
            }
        })

        footer();

        // golden debt trajectory page
        doc.addPage();
        detailHeader();

        normal();
        doc.setFontSize(24)
        doc.text("IF YOU USE THE", 25, 45);
        doc.setTextColor("#e15119")
        doc.text("G.O.L.D.E.N.", 95, 45);
        doc.setTextColor("#000");
        bold();
        doc.text("DEBT-ELIMINATION PLAN", 25, 57);

        /**/
        var mortText = flags.mortPlural ? "Mortgages" : "Mortgage";

        let tablePage7 = [
            ["", "Without " + mortText, "With " + mortText],
            ["Total Debt Balance:", formatter.money(data.$debtbalancenm), formatter.money(data.$debtbalance)],
            ["Total Number of Years to Repay Debt:", formatter.year(data.$debtyearsnm), formatter.year(data.$debtyears)],
            ["When You Will Be Debt-Free:", data.$debtfreedatenm, data.$debtfreedate],
            ["Total Cost of the Debt (Interest):", formatter.money(data.$interestnm), formatter.money(data.$interest)],
            ["Amount You Will Pay to Eliminate Debt:", formatter.money(data.$totalrealdebtnm), formatter.money(data.$totalrealdebt)]
        ];
        if (!flags.mortPresent) {
            tablePage7.map(arr => {
                return arr.splice(2, 1);
            })
            tablePage7[0][1] = "G.O.L.D.E.N."
        }

        autoTable(doc, {
            tableWidth: 160,
            margin: {
                left: 25
            },
            startY: 75,
            theme: "striped",
            body: tablePage7,
            bodyStyles: {
                fontSize: 12,
                cellPadding: {
                    vertical: 2,
                    horizontal: 3
                }
            },
            columnStyles: {
                0: {
                    cellWidth: 80,
                    textColor: "#464e6f"
                },
                1: {
                    fontStyle: "bold",
                    // halign: "right",
                    textColor: "#2f4e6f"
                },
                2: {
                    fontStyle: "bold",
                    // halign: "right",
                    textColor: "#2f4e6f"
                }
            },
            didParseCell: function(cellData) {
                if (cellData.row.index == 0) {
                    switch (cellData.column.index) {
                        case 0:
                            {
                                cellData.cell.styles.fillColor = "#e3e9ec";
                                break;
                            }
                        case 1:
                        case 2:
                            {
                                cellData.cell.styles.fillColor = "#2f4e6f";
                                cellData.cell.styles.textColor = "#fff";
                                cellData.cell.styles.fontStyle = "bold"
                                cellData.cell.styles.halign = "center"
                                break;
                            }
                    }
                } else {
                    if (cellData.row.index % 2 == 1) {
                        cellData.cell.styles.fillColor = "#c8d7e3"
                    }
                }
            }
        })
        if (flags.mortPresent) {
            doc.addImage($.img("house", "png"), 178, 109, 20, 20)
        }

        doc.setFontSize(18);
        normal();
        doc.setTextColor("#e15119");
        doc.text("G.O.L.D.E.N.", 25, 150);
        doc.setTextColor("#000");
        doc.text("DEBT-BY-DEBT", 65, 150);
        bold();
        doc.text("REPAYMENT PLAN", 25, 158, {
            charSpace: 0.5
        })

        autoTable(doc, {
            tableWidth: 170,
            startY: 165,
            theme: "striped",
            margin: {
                left: 25,
                bottom: 50
            },
            body: [...data.$debtTragectory, { name: "Total", balance: data.$debtbalance, minpay: data.$totalminpay, months: data.$debtmonths, date: data.$debtfreedate, loan: data.$totalloan, redirect: data.$totalminpay }],
            columnStyles: {
                0: { halign: "left", minCellWidth: 25 },
                1: { halign: "right", minCellWidth: 25 },
                2: { halign: "right" },
                3: { halign: "right" },
                4: { halign: "center", minCellWidth: 15 },
                5: { halign: "left", minCellWidth: 20 },
                6: { halign: "right", minCellWidth: 25 },
                7: { halign: "right", minCellWidth: 25 },
            },
            alternateRowStyles: {
                fillColor: "#c8d7e3"
            },
            headStyles: {
                fontSize: 8,
                fontStyle: "bold",
                halign: "center",
                valign: "middle",
                fillColor: "#2f4e6f",
                textColor: "white"
            },
            bodyStyles: {
                valign: "middle",
                fontSize: 8,
                cellPadding: {
                    horizontal: 1,
                    vertical: 1
                }
            },
            columns: [{
                header: "Name",
                dataKey: "name"
            }, {
                header: "Balance Today",
                dataKey: "balance"
            }, {
                header: "Interest Rate",
                dataKey: "IR"
            }, {
                header: "Monthly Payment",
                dataKey: "minpay"
            }, {
                header: "# of payments",
                dataKey: "months"
            }, {
                header: "Debt Payoff Date",
                dataKey: "date"
            }, {
                header: "Payoff Balance",
                dataKey: "loan"
            }, {
                header: "Redirected Payments",
                dataKey: "redirect"
            }],
            didDrawPage: $.pageNumber,
            didParseCell: function(cellData) {
                if (cellData.section !== "head") {
                    switch (cellData.column.index) {
                        case 1:
                        case 3:
                        case 6:
                        case 7:
                            cellData.cell.text = formatter.money(cellData.cell.text);
                            break;
                        case 2:
                            {
                                if (isNaN(parseFloat(cellData.cell.text.join("")))) break;
                                cellData.cell.text = formatter.percent(cellData.cell.text);
                                break;
                            }
                    }
                }
                if (cellData.row.index == data.$debtTragectory.length) {
                    cellData.cell.styles.fontStyle = "bold";
                    cellData.cell.styles.fillColor = "#e15119";
                    cellData.cell.styles.textColor = "#fff";
                }
            }
        })

        footer();

        // two plan comparison without mortgages
        doc.addPage();
        detailHeader();
        $.pageNumber();

        normal();
        doc.setFontSize(26);
        doc.setTextColor("#000");
        doc.text("TWO PLAN COMPARISON", 25, 45);
        bold();
        doc.text("CURRENT  v.", 25, 55, { charSpace: 0.5 });
        doc.setTextColor("#e15119");
        doc.text("G.O.L.D.E.N.", 92, 55, {
            charSpace: 0.5
        });
        doc.setFontSize(12);
        normal();
        doc.setTextColor("#000");
        if (flags.mortPresent) {
            doc.text("(without mortgage)", 25, 62)
        }

        autoTable(doc, {
            tableWidth: 170,
            startY: 70,
            theme: "striped",
            margin: {
                left: 25
            },
            body: [
                { desc: "", curr: "Current", gold: "G.O.L.D.E.N." },
                { desc: "Total Debt Balance:", curr: formatter.money(data.$debtbalancenm), gold: formatter.money(data.$debtbalancenm) },
                { desc: "Total Number of Years to Repay Debt:", curr: formatter.year(data.$debtyearscnm), gold: formatter.year(data.$debtyearsnm) },
                { desc: "When You Will Be Debt Free:", curr: (data.$debtfreedatec), gold: (data.$debtfreedatenm) },
                { desc: "Total Cost of the Debt (Interest):", curr: formatter.money(data.$interestcnm), gold: formatter.money(data.$interestnm) },
                { desc: "Amount You Will Pay to Elminate Debt:", curr: formatter.money(data.$totalrealdebtcnm), gold: formatter.money(data.$totalrealdebtnm) },
            ],
            bodyStyles: {
                fontSize: 12,
                cellPadding: {
                    vertical: 2,
                    horizontal: 3
                }
            },
            columnStyles: {
                0: {
                    cellWidth: 80,
                    fontStyle: "bold",
                    textColor: "#464e6f"
                },
                1: {
                    halign: "right",
                    textColor: "#2f4e6f"
                },
                2: {
                    fontStyle: "bold",
                    halign: "right",
                    textColor: "#2f4e6f"
                },
                columns: [{
                        header: "",
                        dataKey: "desc"
                    },
                    {
                        header: "Current",
                        dataKey: "curr"
                    },
                    {
                        header: "G.O.L.D.E.N.",
                        dataKey: "gold"
                    }
                ]
            },
            didParseCell: function(cellData) {
                if (cellData.row.index == 0) {
                    switch (cellData.column.index) {
                        case 0:
                            {
                                cellData.cell.styles.fillColor = "#e3e9ec";
                                break;
                            }
                        case 1:
                        case 2:
                            {
                                cellData.cell.styles.fillColor = "#2f4e6f";
                                cellData.cell.styles.textColor = "#fff";
                                cellData.cell.styles.fontStyle = "bold"
                                cellData.cell.styles.halign = "center"
                                break;
                            }
                    }
                } else {
                    if (cellData.row.index % 2 == 1) {
                        cellData.cell.styles.fillColor = "#c8d7e3"
                    }
                }
            }
        })

        normal();
        doc.setFontSize(18)
        doc.setTextColor("#000");
        doc.text("With G.O.L.D.E.N., you could save", 25, 153);
        bold();
        doc.setTextColor("#e15119");
        doc.text(`${formatter.year(data.$yearssavednm)} years`, 125, 153);
        normal();
        doc.setTextColor("#000");
        doc.text("and", doc.getTextDimensions(`${formatter.year(data.$yearssavednm)} years`, {
            fontSize: 18,
        }).w + 3 + 125, 153);
        doc.setTextColor("#e15119");
        bold();
        doc.text(`${formatter.negMoney(data.$interestsavednm)} in interest`, 25, 160);
        normal();
        doc.setTextColor("#000");
        doc.text("to pay off your debt!", doc.getTextDimensions(`${formatter.negMoney(data.$interestsavednm)} in interest`, {
            fontSize: 18,
        }).w + 25 + 5, 160)

        doc.setFontSize(16);
        doc.setTextColor("#324c6f");
        normal();
        doc.text("You could also accumulate", 25, 180);

        doc.setTextColor("#e15119");
        bold();
        doc.setFontSize(18);
        doc.text(formatter.moneyInt(data.$liquiditycnm), 50, 188);

        doc.setTextColor("#000");
        doc.text("in tax-free savings", 70, 196)

        normal();
        doc.setTextColor("#324c6f");
        doc.text("and", 155, 205, {
            "align": "center"
        });

        doc.setTextColor("#e15119");
        bold();
        doc.text(formatter.moneyInt(data.$passoncnm), 155, 213, {
            align: "center"
        })

        doc.setTextColor("#000");
        doc.text("to pass on to your heirs", 155, 221, {
            align: "center"
        });

        normal();
        doc.setTextColor("#324c6f");
        doc.setFontSize(14);
        doc.text("all in the", 25, 230);
        bold();
        doc.text("same amount of time", 45, 230);
        normal();
        doc.text("it would have taken you", 36, 236);
        doc.text("to get                  in your current plan", 47, 242);
        bold();
        doc.text("debt free", 61, 242);
        normal();
        doc.text("and               spending                  money!", 25, 248);
        bold();
        doc.text("without", 35, 248);
        doc.text("any more", 75, 248);
        footer();

        // two plan comparison with mortgages
        if (flags.mortPresent) {
            doc.addPage();
            $.pageNumber();
            detailHeader();

            normal();
            doc.setFontSize(26);
            doc.setTextColor("#000");
            doc.text("TWO PLAN COMPARISON", 25, 45);
            bold();
            doc.text("CURRENT  v.", 25, 55, { charSpace: 0.5 });
            doc.setTextColor("#e15119");
            doc.text("G.O.L.D.E.N.", 92, 55, {
                charSpace: 0.5
            });
            doc.setFontSize(12);
            normal();
            doc.setTextColor("#000");
            doc.text("(with mortgage)", 25, 62)

            doc.addImage($.img("house", "png"), 165, 42, 30, 30)

            autoTable(doc, {
                tableWidth: 170,
                startY: 70,
                theme: "striped",
                margin: {
                    left: 25
                },
                body: [
                    { desc: "", curr: "Current", gold: "G.O.L.D.E.N." },
                    { desc: "Total Debt Balance:", curr: formatter.money(data.$debtbalance), gold: formatter.money(data.$debtbalance) },
                    { desc: "Total Number of Years to Repay Debt:", curr: formatter.year(data.$debtyearsc), gold: formatter.year(data.$debtyears) },
                    { desc: "When You Will Be Debt Free:", curr: (data.$debtfreedatec), gold: (data.$debtfreedate) },
                    { desc: "Total Cost of the Debt (Interest):", curr: formatter.money(data.$interestc), gold: formatter.money(data.$interest) },
                    { desc: "Amount You Will Pay to Elminate Debt:", curr: formatter.money(data.$totalrealdebtc), gold: formatter.money(data.$totalrealdebt) },
                ],
                bodyStyles: {
                    fontSize: 12,
                    cellPadding: {
                        vertical: 2,
                        horizontal: 3
                    }
                },
                columnStyles: {
                    0: {
                        cellWidth: 80,
                        fontStyle: "bold",
                        textColor: "#464e6f"
                    },
                    1: {
                        halign: "right",
                        textColor: "#2f4e6f"
                    },
                    2: {
                        fontStyle: "bold",
                        halign: "right",
                        textColor: "#2f4e6f"
                    },
                    columns: [{
                            header: "",
                            dataKey: "desc"
                        },
                        {
                            header: "Current",
                            dataKey: "curr"
                        },
                        {
                            header: "G.O.L.D.E.N.",
                            dataKey: "gold"
                        }
                    ]
                },
                didParseCell: function(cellData) {
                    if (cellData.row.index == 0) {
                        switch (cellData.column.index) {
                            case 0:
                                {
                                    cellData.cell.styles.fillColor = "#e3e9ec";
                                    break;
                                }
                            case 1:
                            case 2:
                                {
                                    cellData.cell.styles.fillColor = "#2f4e6f";
                                    cellData.cell.styles.textColor = "#fff";
                                    cellData.cell.styles.fontStyle = "bold"
                                    cellData.cell.styles.halign = "center"
                                    break;
                                }
                        }
                    } else {
                        if (cellData.row.index % 2 == 1) {
                            cellData.cell.styles.fillColor = "#c8d7e3"
                        }
                    }
                }
            })

            normal();
            doc.setFontSize(18)
            doc.setTextColor("#000");
            doc.text("With G.O.L.D.E.N., you could save", 25, 153);
            bold();
            doc.setTextColor("#e15119");
            doc.text(`${formatter.year(data.$yearssaved)} years`, 125, 153);
            normal();
            doc.setTextColor("#000");
            doc.text("and", doc.getTextDimensions(`${formatter.year(data.$yearssaved)} years`, {
                fontSize: 18,
            }).w + 3 + 125, 153);
            doc.setTextColor("#e15119");
            bold();
            doc.text(`${formatter.negMoney(data.$interestsaved)} in interest`, 25, 160);
            normal();
            doc.setTextColor("#000");
            doc.text("to pay off your debt!", doc.getTextDimensions(`${formatter.negMoney(data.$interestsaved)} in interest`, {
                fontSize: 18,
            }).w + 25 + 5, 160)

            doc.setFontSize(16);
            doc.setTextColor("#324c6f");
            normal();
            doc.text("You could also accumulate", 25, 180);

            doc.setTextColor("#e15119");
            bold();
            doc.setFontSize(18);
            doc.text(formatter.moneyInt(data.$liquidityc), 50, 188);

            doc.setTextColor("#000");
            doc.text("in tax-free savings", 70, 196)

            normal();
            doc.setTextColor("#324c6f");
            doc.text("and", 155, 205, {
                "align": "center"
            });

            doc.setTextColor("#e15119");
            bold();
            doc.text(formatter.moneyInt(data.$passonc), 155, 213, {
                align: "center"
            })

            doc.setTextColor("#000");
            doc.text("to pass on to your heirs", 155, 221, {
                align: "center"
            });

            normal();
            doc.setTextColor("#324c6f");
            doc.setFontSize(14);
            doc.text("all in the", 25, 230);
            bold();
            doc.text("same amount of time", 45, 230);
            normal();
            doc.text("it would have taken you", 36, 236);
            doc.text("to get                  in your current plan", 47, 242);
            bold();
            doc.text("debt free", 61, 242);
            normal();
            doc.text("and               spending                  money!", 25, 248);
            bold();
            doc.text("without", 35, 248);
            doc.text("any more", 75, 248);
            footer();
        }
        // non mortgage illustration
        doc.addPage();
        detailHeader();

        doc.setTextColor("#000")
        bold();
        doc.setFontSize(16);
        doc.text(["Projected Insurance Illustration", "With Loans and Savings Balances"], doc.internal.pageSize.width / 2, 45, {
            align: "center"
        })
        normal();
        doc.setFontSize(14);
        if (flags.mortPresent) {
            doc.text("(without paying off mortgages)", doc.internal.pageSize.width / 2, 58, {
                align: "center"
            })
        }

        autoTable(doc, {
            startY: 65,
            tableWidth: 180,
            margin: {
                left: 15
            },
            body: data.$illustrationnm,
            headStyles: {
                fontSize: 6,
                fontStyle: "bold",
                halign: "center",
                valign: "middle",
                fillColor: "#2f4e6f",
                textColor: "white"
            },
            bodyStyles: {
                halign: "right",
                valign: "middle",
                fontSize: 7
            },
            columnStyles: {
                0: { halign: "center", fillColor: "#fff" },
                1: { halign: "center", fillColor: "#fff" },
                2: { fillColor: "#fff" },
                3: { fillColor: "#fff" },
                4: { fillColor: "#fff" },
                5: { fillColor: "#c8d7e3" },
                6: { fillColor: "#c8d7e3" },
                7: { fillColor: "#c8d7e3" },
                8: { fillColor: "#98b1c4" },
                9: { fillColor: "#98b1c4" },
                10: { fillColor: "#98b1c4" },
                11: { fillColor: "#98b1c4" }
            },
            columns: [{
                header: "Year",
                dataKey: "index"
            }, {
                header: "Calendar Year",
                dataKey: "year"
            }, {
                header: "Premium",
                dataKey: "premium"
            }, {
                header: "Cash Value",
                dataKey: "cv"
            }, {
                header: "Death Benefit",
                dataKey: "db"
            }, {
                header: "Used from Savings",
                dataKey: "sl"
            }, {
                header: "Cash Value Loan",
                dataKey: "cvl"
            }, {
                header: "Loan Balance at EOY",
                dataKey: "eoy"
            }, {
                header: "Available CV for Debt",
                dataKey: "cv80"
            }, {
                header: "20% CV",
                dataKey: "cv20"
            }, {
                header: "Savings outside IGIC",
                dataKey: "sb"
            }, {
                header: "Total Liquidity",
                dataKey: "liq"
            }],
            didDrawPage: $.pageNumber,
            didParseCell: function(cellData) {
                if (cellData.section == "body") {
                    if (parseFloat(cellData.row.cells.cvl.raw) > 0) {
                        cellData.cell.styles.fillColor = "#f4b083"
                    }
                }
                if (cellData.section !== "head") {
                    if (cellData.column.index > 1) {
                        cellData.cell.text = formatter.chartMoney(cellData.cell.text);
                    }
                }
            }
        })


        if (flags.mortPresent) {
            doc.addPage();
            detailHeader();

            doc.setTextColor("#000")
            bold();
            doc.setFontSize(16);
            doc.text(["Projected Insurance Illustration", "With Loans and Savings Balances"], doc.internal.pageSize.width / 2, 45, {
                align: "center"
            })
            normal();
            doc.setFontSize(14);
            doc.text("(with mortgage payoff)", doc.internal.pageSize.width / 2, 58, {
                align: "center"
            })

            autoTable(doc, {
                startY: 65,
                tableWidth: 180,
                margin: {
                    left: 15
                },
                body: data.$illustration,
                headStyles: {
                    fontSize: 6,
                    fontStyle: "bold",
                    halign: "center",
                    valign: "middle",
                    fillColor: "#2f4e6f",
                    textColor: "white"
                },
                bodyStyles: {
                    halign: "right",
                    valign: "middle",
                    fontSize: 7
                },
                columnStyles: {
                    0: { halign: "center", fillColor: "#fff" },
                    1: { halign: "center", fillColor: "#fff" },
                    2: { fillColor: "#fff" },
                    3: { fillColor: "#fff" },
                    4: { fillColor: "#fff" },
                    5: { fillColor: "#c8d7e3" },
                    6: { fillColor: "#c8d7e3" },
                    7: { fillColor: "#c8d7e3" },
                    8: { fillColor: "#98b1c4" },
                    9: { fillColor: "#98b1c4" },
                    10: { fillColor: "#98b1c4" },
                    11: { fillColor: "#98b1c4" }
                },
                columns: [{
                    header: "Year",
                    dataKey: "index"
                }, {
                    header: "Calendar Year",
                    dataKey: "year"
                }, {
                    header: "Premium",
                    dataKey: "premium"
                }, {
                    header: "Cash Value",
                    dataKey: "cv"
                }, {
                    header: "Death Benefit",
                    dataKey: "db"
                }, {
                    header: "Used from Savings",
                    dataKey: "sl"
                }, {
                    header: "Cash Value Loan",
                    dataKey: "cvl"
                }, {
                    header: "Loan Balance at EOY",
                    dataKey: "eoy"
                }, {
                    header: "Available CV for Debt",
                    dataKey: "cv80"
                }, {
                    header: "20% CV",
                    dataKey: "cv20"
                }, {
                    header: "Savings outside IGIC",
                    dataKey: "sb"
                }, {
                    header: "Total Liquidity",
                    dataKey: "liq"
                }],
                didDrawPage: $.pageNumber,
                didParseCell: function(cellData) {
                    if (cellData.section == "body") {
                        if (parseFloat(cellData.row.cells.cvl.raw) > 0) {
                            cellData.cell.styles.fillColor = "#f4b083"
                        }
                    }
                    if (cellData.section !== "head") {
                        if (cellData.column.index > 1) {
                            cellData.cell.text = formatter.chartMoney(cellData.cell.text);
                        }
                    }
                }
            })
        }

        doc.save(path.join(__dirname, "..", "results", id, "result.pdf"))
            // doc.save(path.join(__dirname, "result.pdf"))
    } // doc.save(path.join(__dirname, "result.pdf"))
}