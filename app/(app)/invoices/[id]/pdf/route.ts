import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import { loadInvoice } from "@/lib/invoice/data"
import { invoicePdfLocation } from "@/lib/invoice/filename"
import { createClient } from "@/utils/supabase/server"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: idParam } = await context.params
  const invoiceId = Number(idParam)
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    notFound()
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const invoice = await loadInvoice(supabase, invoiceId)
  if (!invoice?.pdf_path) {
    notFound()
  }

  const { data, error } = await supabase.storage.from("invoices").download(invoice.pdf_path)
  if (error || !data) {
    return new Response(error?.message ?? "The PDF could not be downloaded.", {
      status: 404,
    })
  }

  const filename =
    invoice.pdf_path.split("/").pop() ??
    invoicePdfLocation({
      userId: invoice.user_id,
      invoiceId: invoice.id,
      invoiceDate: invoice.invoice_date,
      invoiceNumber: invoice.invoice_number,
    }).basename

  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
