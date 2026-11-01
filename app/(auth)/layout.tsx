export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-svh flex-1 flex-col">{children}</div>
}
