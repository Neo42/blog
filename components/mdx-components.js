import CodeBlock from './code-block'
import CustomLink from './custom-link'
import {
  Hike as HikeSteps,
  Focus,
  CodeSlot,
  PreviewSlot,
  StepHead,
  withFocusHandler,
} from '@code-hike/scrollycoding'

const classes = {
  'ch-hike-step-content-unfocused': 'opacity-25 transition-opacity',
  'ch-hike-step-content': 'border-none',
  'ch-frame-button': 'bg-button-bg border-button-bg',
  'ch-frame-title-bar': 'bg-editor-bg',
  'ch-editor-tab': 'border-none bg-editor-bg',
}

const preset = {
  template: 'react',
  customSetup: {
    dependencies: {
      'react-svg-curve': '0.2.0',
    },
  },
}

function Hike({config, ...props}) {
  const editorProps = {
    codeProps: {minColumns: 40},
    frameProps: {button: null},
    ...props.editorProps,
  }

  const defaultConfig = {
    noPreview: false,
    defaultFileName: 'App.js',
  }

  return (
    <HikeSteps
      classes={classes}
      config={{...defaultConfig, ...config}}
      preset={preset}
      {...props}
      editorProps={editorProps}
    />
  )
}

function HikeWithPreview(props) {
  return <Hike {...props} />
}

function HikeWithNoPreview(props) {
  return <Hike config={{noPreview: true}} {...props} />
}

export const components = {
  pre: CodeBlock,
  // Code Hike:
  a: withFocusHandler(CustomLink),
  Hike,
  HikeWithPreview,
  HikeWithNoPreview,
  Focus,
  StepHead,
  CodeSlot,
  PreviewSlot,
}
