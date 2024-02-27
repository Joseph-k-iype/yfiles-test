import './assets/icons/icons.css';
import './style.css';
import './dialog.css';
import {
  GraphComponent,
  GraphViewerInputMode,
  ICommand,
  ScrollBarVisibility,
  ShapeNodeStyle,
  Rect,
  LinearGradient,
  Color,
  SvgVisual,
  IGraph,
  OrthogonalLayout,
  LayoutExecutor,
  DefaultGraph,
  FoldingManager,
  NodeStyleBase,
  ShapeNodeStyleRenderer,
  GroupNodeStyle,
  FreeNodeLabelModel,
  Point,
  InteriorLabelModel, InteriorLabelModelPosition
} from 'yfiles';
import { enableFolding } from './lib/FoldingSupport';
import './lib/yFilesLicense';
import { initializeTooltips } from './tooltips';
import { exportDiagram } from './diagram-export';
import { PrintingSupport } from './lib/PrintingSupport';
import { initializeContextMenu } from './context-menu';
import { initializeGraphSearch } from './graph-search';

async function run() {
  const graphComponent = await initializeGraphComponent();
  initializeToolbar(graphComponent);
  initializeTooltips(graphComponent);
  initializeContextMenu(graphComponent);
  initializeGraphSearch(graphComponent);
  await createGraph(graphComponent.graph);
  applyLayout(graphComponent);
}

async function initializeGraphComponent() {
  const graphComponent = new GraphComponent('.graph-component-container');
  graphComponent.horizontalScrollBarPolicy = ScrollBarVisibility.AS_NEEDED_DYNAMIC;
  graphComponent.verticalScrollBarPolicy = ScrollBarVisibility.AS_NEEDED_DYNAMIC;
  const mode = new GraphViewerInputMode();
  mode.navigationInputMode.allowCollapseGroup = true;
  mode.navigationInputMode.allowEnterGroup = true;
  mode.navigationInputMode.allowExitGroup = true;
  mode.navigationInputMode.allowExpandGroup = true;
  graphComponent.inputMode = mode;
  graphComponent.graph = enableFolding(new DefaultGraph());
  return graphComponent;
}

function getColorForNode(type) {
  // Example implementation - replace with your actual logic
  switch (type) {
    case 'domain': return { fillColor: 'lightblue', strokeColor: 'blue' };
    case 'system': return { fillColor: 'lightgreen', strokeColor: 'green' };
    case 'table': return { fillColor: 'lightyellow', strokeColor: 'orange' };
    default: return { fillColor: 'gray', strokeColor: 'black' };
  }
}


async function createGraph(graph) {
  const foldingManager = new FoldingManager(graph);
  const masterGraph = foldingManager.createFoldingView().graph;
  const csvData = [
    { domain: 'Domain1', sourceSystem: 'SystemA', table: 'Table1' },
    { domain: 'Domain1', sourceSystem: 'SystemA', table: 'Table2' },
    { domain: 'Domain2', sourceSystem: 'SystemB', table: 'Table3' },
    { domain: 'Domain2', sourceSystem: 'SystemB', table: 'Table1' },
  ];
  const domainNodes = {};
  const systemNodes = {};
  const tableNodes = {};
  csvData.forEach(row => {
    let domainNode = domainNodes[row.domain];
    if (!domainNode) {
      domainNode = createDomainNode(masterGraph, row.domain);
      domainNodes[row.domain] = domainNode;
    }
    const systemKey = `${row.domain}-${row.sourceSystem}`;
    let systemNode = systemNodes[systemKey];
    if (!systemNode) {
      systemNode = createSystemNode(masterGraph, domainNode, row.sourceSystem);
      systemNodes[systemKey] = systemNode;
    }
    let tableNode = tableNodes[row.table];
    if (!tableNode) {
      tableNode = createTableNode(masterGraph, domainNode, row.table);
      tableNodes[row.table] = tableNode;
    }
    masterGraph.createEdge(systemNode, tableNode);
  });
}

// Example for creating a domain node with stroke
function createDomainNode(graph, domainName) {
  const colors = getColorForNode('domain');

  // Create and configure the group node style
  const groupNodeStyle = new GroupNodeStyle({
    // Set up the group node style properties here
    // For example, use a simple rectangle as the group node indicator
    stroke: colors.strokeColor,
    contentAreaFill: colors.fillColor,

    // ... other properties according to your design requirements
  });

  const domainNode = graph.createGroupNode({
    labels: [domainName],
    style: groupNodeStyle,
    layout: new Rect(0, 0, 100, 50)
  });

  // Set the label model to position the label in the northwest corner
  const labelModel = new InteriorLabelModel({ insets: 5 }); // Adjust insets as needed
  const label = domainNode.labels.first();
  graph.setLabelLayoutParameter(label, labelModel.createParameter(InteriorLabelModelPosition.NORTH_WEST));

  return domainNode;
}

function createSystemNode(graph, parent, systemName) {
  const colorInfo = getColorForNode('system');
  return graph.createNode({
    parent: parent,
    labels: [systemName],
    style: new ShapeNodeStyle({
      shape: 'rectangle',
      fill: colorInfo.fillColor,
      stroke: colorInfo.strokeColor,
      renderer: new ShapeNodeStyleRenderer(),
      cssClass: 'custom-node-style',
      keepIntrinsicAspectRatio: false
    }),
    layout: new Rect(0, 0, 100, 50)
  });
}

function createTableNode(graph, parent, tableName) {
  const colorInfo = getColorForNode('table');
  return graph.createNode({
    parent: parent,
    labels: [tableName],
    style: new ShapeNodeStyle({
      shape: 'rectangle',
      fill: colorInfo.fillColor,
      stroke: colorInfo.strokeColor,
      renderer: new ShapeNodeStyleRenderer(),
      cssClass: 'custom-node-style'
    }),
    layout: new Rect(0, 0, 60, 30)
  });
}




class CustomNodeStyle extends NodeStyleBase {
  constructor(pathData, fillColor, strokeColor = 'black', strokeWidth = 1) {
    super();
    this.pathData = pathData;
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
    this.strokeWidth = strokeWidth;
  }

  createVisual(context, node) {
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const svgElement = document.createElementNS(svgNamespace, 'svg');
    const width = node.layout.width;
    const height = node.layout.height;
    svgElement.setAttribute('width', width.toString());
    svgElement.setAttribute('height', height.toString());
    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const pathElement = document.createElementNS(svgNamespace, 'path');
    pathElement.setAttribute('d', this.pathData);
    pathElement.setAttribute('fill', this.fillColor);
    pathElement.setAttribute('stroke', this.strokeColor); // Add stroke color
    pathElement.setAttribute('stroke-width', this.strokeWidth.toString()); // Add stroke width
    svgElement.appendChild(pathElement);
    const visual = new SvgVisual(svgElement);
    visual.svgElement = svgElement; // Store the SVG element for potential updates
    return visual;
  }

  updateVisual(context, oldVisual, node) {
    // Implement logic to update the visual if necessary, for performance reasons
    return oldVisual;
  }
}


// function createSvgNodeStyle(pathData, fillColor) {
//   return new ShapeNodeStyle({
//     shape: 'rectangle',
//     stroke: null,
//     fill: fillColor,
//     renderer: {
//       getVisualCreator: (node, style) => ({
//         createVisual: (context) => {
//           const svgNamespace = 'http://www.w3.org/2000/svg';
//           const svgElement = document.createElementNS(svgNamespace, 'svg');
//           svgElement.setAttribute('width', '100');
//           svgElement.setAttribute('height', '50');
//           svgElement.setAttribute('viewBox', '0 0 100 50');
//           const pathElement = document.createElementNS(svgNamespace, 'path');
//           pathElement.setAttribute('d', pathData);
//           pathElement.setAttribute('fill', fillColor.toString());
//           svgElement.appendChild(pathElement);
//           return new SvgVisual(svgElement);
//         },
//         updateVisual: (context, oldVisual) => oldVisual
//       })
//     }
//   });
// }

function applyLayout(graphComponent) {
  const layout = new OrthogonalLayout();
  const layoutExecutor = new LayoutExecutor({
    graphComponent,
    layout,
    animateViewport: true
  });
  layoutExecutor.start();
}

function initializeToolbar(graphComponent) {
  document.getElementById('btn-increase-zoom').addEventListener('click', () => {
    ICommand.INCREASE_ZOOM.execute(null, graphComponent);
  });
  document.getElementById('btn-decrease-zoom').addEventListener('click', () => {
    ICommand.DECREASE_ZOOM.execute(null, graphComponent);
  });
  document.getElementById('btn-fit-graph').addEventListener('click', () => {
    ICommand.FIT_GRAPH_BOUNDS.execute(null, graphComponent);
  });
  document.getElementById('btn-export-svg').addEventListener('click', () => {
    exportDiagram(graphComponent, 'svg');
  });
  document.getElementById('btn-export-png').addEventListener('click', () => {
    exportDiagram(graphComponent, 'png');
  });
  document.getElementById('btn-export-pdf').addEventListener('click', () => {
    exportDiagram(graphComponent, 'pdf');
  });
  document.getElementById('btn-print').addEventListener('click', () => {
    new PrintingSupport().printGraph(graphComponent.graph);
  });
}

run();
