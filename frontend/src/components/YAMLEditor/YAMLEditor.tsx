import React, { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'

interface YAMLEditorProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

const YAMLEditor: React.FC<YAMLEditorProps> = ({ value, onChange, error }) => {
  const [editorValue, setEditorValue] = useState(value)

  useEffect(() => {
    setEditorValue(value)
  }, [value])

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorValue(value)
      onChange(value)
    }
  }

  return (
    <div className="yaml-editor-container">
      <Editor
        height="600px"
        defaultLanguage="yaml"
        value={editorValue}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          tabSize: 2,
          fontSize: 14,
        }}
      />
      {error && (
        <div className="yaml-errors">
          <div className="error-item">{error}</div>
        </div>
      )}
    </div>
  )
}

export default YAMLEditor
