import "server-only"

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer"

import {
  formatCents,
  formatDecimal,
  formatIsoDate,
  formatQuantity,
} from "@/lib/invoice/format"
import { partyLines, type InvoicePreviewModel } from "@/lib/invoice/model"
import { invoiceSenderName } from "@/lib/invoice/email"
import { UNIT_LABELS } from "@/lib/invoice/schema"

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 42,
    paddingHorizontal: 42,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111111",
    lineHeight: 1.4,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
  },
  sender: {
    marginTop: 4,
    fontSize: 12,
  },
  columns: {
    marginTop: 28,
    flexDirection: "row",
    gap: 28,
  },
  column: {
    flex: 1,
  },
  label: {
    marginBottom: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    color: "#444444",
  },
  meta: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaBlock: {
    width: "24%",
  },
  tableHeader: {
    marginTop: 26,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    paddingBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderBottomColor: "#bbbbbb",
    paddingVertical: 6,
  },
  description: { width: "34%" },
  quantity: { width: "10%", textAlign: "right" },
  unit: { width: "12%", textAlign: "right" },
  price: { width: "16%", textAlign: "right" },
  vat: { width: "12%", textAlign: "right" },
  amount: { width: "16%", textAlign: "right" },
  totals: {
    marginTop: 12,
    marginLeft: "auto",
    width: "42%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  grand: {
    marginTop: 6,
    fontFamily: "Helvetica-Bold",
  },
  comments: {
    marginTop: 28,
  },
})

function PartyBlock({
  label,
  lines,
}: {
  label: string
  lines: string[]
}) {
  if (lines.length === 0) {
    return null
  }

  return (
    <View style={styles.column}>
      <Text style={styles.label}>{label}</Text>
      {lines.map((line) => (
        <Text key={line}>{line}</Text>
      ))}
    </View>
  )
}

function InvoicePdfDocument({ model }: { model: InvoicePreviewModel }) {
  const senderName = invoiceSenderName(model.from.companyName, model.from.fullName)
  const fromLines = partyLines(model.from, true)
  const toLines = model.to ? partyLines(model.to, false) : []
  const comments = model.comments.trim()

  return (
    <Document title={model.invoiceNumber ?? "Invoice"}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Invoice</Text>
        <Text style={styles.sender}>{senderName}</Text>

        <View style={styles.columns}>
          <PartyBlock label="FROM" lines={fromLines} />
          <PartyBlock label="TO" lines={toLines} />
        </View>

        <View style={styles.meta}>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>INVOICE NUMBER</Text>
            <Text>{model.invoiceNumber ?? "Assigned on send"}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>INVOICE DATE</Text>
            <Text>{model.invoiceDate ? formatIsoDate(model.invoiceDate) : "—"}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>DUE DATE</Text>
            <Text>{model.dueDate ? formatIsoDate(model.dueDate) : "—"}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>CURRENCY</Text>
            <Text>{model.currency}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.description}>Description</Text>
          <Text style={styles.quantity}>Qty</Text>
          <Text style={styles.unit}>Unit</Text>
          <Text style={styles.price}>Price</Text>
          <Text style={styles.vat}>VAT</Text>
          <Text style={styles.amount}>Amount</Text>
        </View>
        {model.lines.map((line, index) => (
          <View key={`${line.description}-${index}`} style={styles.row}>
            <Text style={styles.description}>{line.description || "—"}</Text>
            <Text style={styles.quantity}>
              {line.quantity ? formatQuantity(line.quantity) : "—"}
            </Text>
            <Text style={styles.unit}>{UNIT_LABELS[line.unit]}</Text>
            <Text style={styles.price}>
              {line.unitPrice
                ? formatDecimal(line.unitPrice, model.currency)
                : "—"}
            </Text>
            <Text style={styles.vat}>
              {line.vatRate ? `${formatQuantity(line.vatRate)}%` : "—"}
            </Text>
            <Text style={styles.amount}>
              {line.lineSubtotalCents == null
                ? "—"
                : formatCents(line.lineSubtotalCents, model.currency)}
            </Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatCents(model.subtotalCents, model.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax</Text>
            <Text>{formatCents(model.taxCents, model.currency)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grand]}>
            <Text>Total</Text>
            <Text>{formatCents(model.totalCents, model.currency)}</Text>
          </View>
        </View>

        {comments ? (
          <View style={styles.comments}>
            <Text style={styles.label}>COMMENTS</Text>
            <Text>{comments}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}

export async function renderInvoicePdf(model: InvoicePreviewModel) {
  return renderToBuffer(<InvoicePdfDocument model={model} />)
}
