import Color from 'cli-color'
import Figures from 'figures'

export default {
  check: Color.green(Figures.tick),
  x: Color.red(Figures.cross),
  star: Color.yellow(Figures.star),
}
