const { React } = require('react-blessed-you');
const { Component, createElement } = React;

module.exports = class ParallelView extends Component {
  render() {
    const { boxes } = this.state;

    return createElement('element', null, boxes.map((box, i) => createElement(
      'box', {
        label: box.label,
        key: i,
        top: i === 0 ? '5%' : `${i * (100 / boxes.length)}%`,
        width: '100%',
        height: `${i === 0 ? (100 / boxes.length - 5) : 100 / boxes.length}%`,
        border: { type: 'line' },
        style: {
          border: { fg: box.fg },
        },
        ref: `box${i}`,
        content: box.sink.output,
        scrollable: true,
        scrollbar: {
          bg: 'blue',
        },
        mouse: true,
        onClick: () => {
          const { boxes } = this.state;

          boxes.forEach((box, index) => {
            if (index === i && !box.selected) {
              box.fg = 'blue';
              box.selected = true;
            }
            else if (index !== i && !box.sink.exited) {
              box.fg = 'gray';
              box.selected = false;
            }
            else if (box.sink.exited) {
              box.fg = 'red';
              box.selected = false;
            }
          })

          this.setState({ boxes });
        },
      }
    )));
  }

  constructor(props) {
    super(props);

    const { boxes } = this.props;
    this.state = { boxes };

    boxes.forEach((box, i) => {
      // Default to the first box being selected.
      if (i === 0) {
        box.selected = true;
        box.fg = 'blue';
      }

      box.sink.getOutput(() => this.forceUpdate());

      box.sink.onExit = () => {
        if (!box.selected) {
          box.fg = 'red';
        }

        this.setState({ boxes });
      };

      // Add a `setSelected` function to allow boxes to update the selected
      // state.
      box.setSelected = (selected) => {
        boxes.forEach((box, index) => {
          box.selected = index === i;

          if (box.selected) {
            box.fg = 'blue';
          }
          else if (!box.selected && !box.sink.exited) {
            box.fg = 'gray';
          }
          else if (box.sink.exited) {
            box.fg = 'red';
          }
        })

        this.setState({ boxes });
      };
    });
  }

  componentDidUpdate() {
    const { boxes } = this.props;

    boxes.forEach((__unused__, i) => {
      const box = this.refs[`box${i}`];
      const scrollHeight = box.getScrollHeight();

      box.setScroll(scrollHeight);
    });
  }
};
