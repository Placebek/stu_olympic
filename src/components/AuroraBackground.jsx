export default function AuroraBackground() {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #e8eaff 0%, #f0f4ff 30%, #e8f4fd 60%, #ede8ff 100%)',
        }}
      />
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
    </div>
  )
}
