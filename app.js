let NODE_WIDTH = 296;
let GROUP_WIDTH = 296;
let GROUP_HEIGHT = 90;
let GROUP_HEADER_HEIGHT = 48;
let ANIMATION_DURATION = 650;
let architecture;
let layoutResult;
let renderSequence = 0;
let expandedGroups = new Set();
let elk = new ELK();
let svg = d3.select('#diagram');
let definitions = svg.append('defs');
definitions
    .append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 5)
    .attr('markerWidth', 7)
    .attr('markerHeight', 7)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('fill', '#7f8b98');
definitions
    .append('marker')
    .attr('id', 'arrow-loop')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 5)
    .attr('markerWidth', 7)
    .attr('markerHeight', 7)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('fill', '#f2cc60');
let viewport = svg.append('g');
let zoom = d3
    .zoom()
    .scaleExtent([0.08, 3])
    .on('zoom', event => viewport.attr('transform', event.transform));

svg.call(zoom).on('dblclick.zoom', null);

let $message = document.querySelector('#message');
let $measure = document.createElement('div');
$measure.id = 'measure';
document.body.append($measure);

function parseArchitecture(markdown) {
    let groups = [];
    let nodes = [];
    let edges = [];
    let nodeIds = new Set();
    let pendingId = null;
    let currentGroup = null;
    let currentNode = null;
    let tokens = marked.lexer(markdown);

    for (let token of tokens) {
        let anchor = token.raw.match(/<a\s+id="([^"]+)"\s*><\/a>/i);
        let palette = token.raw.match(/<!--\s*class:\s*([\w-]+)\s*-->/i);
        let layout = token.raw.match(/<!--\s*layout:\s*([\w-]+)\s*-->/i);
        let description = token.raw.match(/<!--\s*description:\s*(.*?)\s*-->/i);
        let connection = token.raw.match(/<!--\s*to:\s*([\w-]+)\s*\|\s*(.*?)\s*-->/i);

        if (anchor) {
            pendingId = anchor[1];
            continue;
        }
        if (palette && currentGroup && !currentNode) {
            currentGroup.palette = palette[1];
            continue;
        }
        if (layout && currentGroup && !currentNode) {
            currentGroup.layout = layout[1];
            continue;
        }
        if (description && currentGroup && !currentNode) {
            currentGroup.description = description[1];
            continue;
        }
        if (connection && currentNode) {
            let connectionParts = connection[2].split(/\s+\|\s+/);
            edges.push({
                id: `edge-${edges.length + 1}`,
                source: currentNode.id,
                target: connection[1],
                label: connectionParts[0],
                style: ['dashed', 'loop'].includes(connectionParts[1]) ? connectionParts[1] : 'solid'
            });
            continue;
        }

        if (token.type === 'heading' && token.depth === 2) {
            if (!pendingId) {
                throw new Error(`Missing stable id before group "${token.text}".`);
            }
            currentGroup = {
                id: pendingId,
                title: token.text,
                palette: 'context',
                layout: 'supporting',
                description: '',
                nodes: []
            };
            groups.push(currentGroup);
            currentNode = null;
            pendingId = null;
            continue;
        }

        if (token.type === 'heading' && token.depth === 3) {
            if (!currentGroup || !pendingId) {
                throw new Error(`Missing group or stable id before node "${token.text}".`);
            }
            if (nodeIds.has(pendingId)) {
                throw new Error(`Duplicate node id "${pendingId}".`);
            }
            currentNode = {
                id: pendingId,
                title: token.text,
                bodyMarkdown: '',
                groupId: currentGroup.id,
                palette: currentGroup.palette
            };
            currentGroup.nodes.push(currentNode);
            nodes.push(currentNode);
            nodeIds.add(currentNode.id);
            pendingId = null;
            continue;
        }

        if (currentNode && token.type !== 'space') {
            currentNode.bodyMarkdown += `${token.raw.trim()}\n\n`;
        }
    }

    for (let group of groups) {
        for (let node of group.nodes) {
            node.palette = group.palette;
            node.bodyHtml = DOMPurify.sanitize(marked.parse(node.bodyMarkdown, { breaks: true }));
        }
    }

    for (let edge of edges) {
        if (!nodeIds.has(edge.target)) {
            throw new Error(`Unknown edge target "${edge.target}".`);
        }
    }

    if (groups.some(group => group.nodes.length === 0)) {
        throw new Error('Every group needs at least one node.');
    }
    if (groups.some(group => !group.description)) {
        throw new Error('Every group needs a short description.');
    }

    return {
        groups,
        nodes,
        edges,
        nodeById: new Map(nodes.map(node => [node.id, node])),
        groupById: new Map(groups.map(group => [group.id, group]))
    };
}

function measureNodes() {
    for (let node of architecture.nodes) {
        $measure.className = `node-card palette-${node.palette}`;
        $measure.innerHTML = `<div class="node-title"></div><div class="node-body"></div>`;
        $measure.querySelector('.node-title').textContent = node.title;
        $measure.querySelector('.node-body').innerHTML = node.bodyHtml;
        node.width = NODE_WIDTH;
        node.height = Math.max(82, Math.ceil($measure.scrollHeight + 2));
    }
    let siblingGroups = new Map();
    for (let node of architecture.nodes) {
        let targets = architecture.edges
            .filter(edge => edge.source === node.id && edge.style !== 'dashed')
            .map(edge => edge.target)
            .sort();
        if (targets.length === 0) {
            continue;
        }
        let key = `${node.groupId}:${targets.join(',')}`;
        if (!siblingGroups.has(key)) {
            siblingGroups.set(key, []);
        }
        siblingGroups.get(key).push(node);
    }
    for (let siblings of siblingGroups.values()) {
        if (siblings.length < 2) {
            continue;
        }
        let height = Math.max(...siblings.map(node => node.height));
        for (let node of siblings) {
            node.height = height;
        }
        let targets = architecture.edges
            .filter(edge => edge.source === siblings[0].id && edge.style !== 'dashed')
            .map(edge => edge.target);
        if (targets.length === 1) {
            architecture.nodeById.get(targets[0]).orderedInputs = siblings.map(node => node.id);
        }
    }
    $measure.replaceChildren();
    $measure.className = '';
}

function wrapLabel(label, maximumLength = 24) {
    let words = label.split(/\s+/);
    let lines = [];
    let line = '';

    for (let word of words) {
        let candidate = line ? `${line} ${word}` : word;
        if (candidate.length <= maximumLength || !line) {
            line = candidate;
            continue;
        }
        lines.push(line);
        line = word;
    }
    if (line) {
        lines.push(line);
    }
    return lines;
}

function buildLayoutGraph(activeGroups) {
    let mainGroups = architecture.groups.filter(group => group.layout === 'main');
    let visibleNodeId = nodeId => {
        let node = architecture.nodeById.get(nodeId);
        return activeGroups.has(node.groupId) ? node.id : `group-${node.groupId}`;
    };
    let visibleTargetId = edge => {
        let source = architecture.nodeById.get(edge.source);
        let target = architecture.nodeById.get(edge.target);
        if (
            activeGroups.has(source.groupId) &&
            activeGroups.has(target.groupId) &&
            target.orderedInputs?.includes(source.id)
        ) {
            return `ordered-input-${source.id}-${target.id}`;
        }
        return visibleNodeId(edge.target);
    };
    let children = architecture.groups.map(group => {
        let useMainPorts = group.layout === 'main' && !activeGroups.has(group.id);
        let mainLayoutOptions = useMainPorts ? { 'elk.portConstraints': 'FIXED_SIDE' } : {};
        let mainPorts = useMainPorts
            ? [
                  {
                      id: `main-in-${group.id}`,
                      width: 1,
                      height: 1,
                      layoutOptions: { 'elk.port.side': 'NORTH' }
                  },
                  {
                      id: `main-out-${group.id}`,
                      width: 1,
                      height: 1,
                      layoutOptions: { 'elk.port.side': 'SOUTH' }
                  }
              ]
            : [];
        if (!activeGroups.has(group.id)) {
            return {
                id: `group-${group.id}`,
                width: GROUP_WIDTH,
                height: GROUP_HEIGHT,
                dataType: 'collapsed-group',
                sourceId: group.id,
                layoutOptions: mainLayoutOptions,
                ports: mainPorts
            };
        }
        return {
            id: `group-${group.id}`,
            dataType: 'expanded-group',
            sourceId: group.id,
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'DOWN',
                'elk.padding': `[top=${GROUP_HEADER_HEIGHT + 18},left=20,bottom=20,right=20]`,
                'elk.spacing.nodeNode': '24',
                'elk.layered.spacing.nodeNodeBetweenLayers': '42',
                'elk.edgeRouting': 'ORTHOGONAL',
                ...mainLayoutOptions
            },
            ports: mainPorts,
            children: group.nodes.map(node => {
                let orderedInputs = node.orderedInputs || [];
                return {
                    id: node.id,
                    width: node.width,
                    height: node.height,
                    dataType: 'node',
                    sourceId: node.id,
                    layoutOptions: orderedInputs.length > 0 ? { 'elk.portConstraints': 'FIXED_ORDER' } : {},
                    ports: orderedInputs.map((sourceId, index) => ({
                        id: `ordered-input-${sourceId}-${node.id}`,
                        width: 1,
                        height: 1,
                        layoutOptions: {
                            'elk.port.side': 'NORTH',
                            'elk.port.index': `${index}`
                        }
                    }))
                };
            })
        };
    });
    children.splice(1, 0, {
        id: 'main-axis-start',
        width: 1,
        height: 1,
        dataType: 'layout-anchor'
    });
    let visibleEdges = new Map();

    for (let edge of architecture.edges) {
        if (edge.style === 'loop') {
            continue;
        }
        let source = visibleNodeId(edge.source);
        let target = visibleTargetId(edge);
        if (source === target) {
            continue;
        }
        let key = `${source}::${target}`;
        if (!visibleEdges.has(key)) {
            visibleEdges.set(key, { source, target, originals: [] });
        }
        visibleEdges.get(key).originals.push(edge);
    }

    let edges = Array.from(visibleEdges.values()).map((edge, index) => {
        let labels = [...new Set(edge.originals.map(original => original.label))];
        let label = edge.originals.length === 1 ? labels[0] : `${edge.originals.length} connections`;
        let lines = wrapLabel(label);
        let width = Math.min(180, Math.max(72, Math.max(...lines.map(line => line.length)) * 6.3 + 18));
        let height = lines.length * 14 + 10;
        let showLabel =
            edge.originals.length === 1 && !edge.source.startsWith('group-') && !edge.target.startsWith('group-');
        return {
            id: `visible-edge-${index + 1}`,
            sources: [edge.source],
            targets: [edge.target],
            labelText: label,
            labelLines: lines,
            edgeStyle: edge.originals.every(original => original.style === 'dashed')
                ? 'dashed'
                : edge.originals.some(original => original.style === 'loop')
                  ? 'loop'
                  : 'solid',
            labels: showLabel ? [{ id: `visible-edge-label-${index + 1}`, text: label, width, height }] : []
        };
    });
    let mainAxisEdges = mainGroups.map((group, index) => ({
        id: `main-axis-${index + 1}`,
        sources: [
            index === 0
                ? 'main-axis-start'
                : activeGroups.has(mainGroups[index - 1].id)
                  ? `group-${mainGroups[index - 1].id}`
                  : `main-out-${mainGroups[index - 1].id}`
        ],
        targets: [activeGroups.has(group.id) ? `group-${group.id}` : `main-in-${group.id}`],
        dataType: 'layout-edge',
        layoutOptions: {
            'elk.layered.priority.direction': '1000',
            'elk.layered.priority.shortness': '1000',
            'elk.layered.priority.straightness': '1000'
        }
    }));

    return {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            'elk.json.edgeCoords': 'ROOT',
            'elk.padding': '[top=96,left=80,bottom=80,right=80]',
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.spacing.nodeNode': '72',
            'elk.layered.spacing.nodeNodeBetweenLayers': '110',
            'elk.layered.cycleBreaking.strategy': 'GREEDY',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.layered.considerModelOrder.groupModelOrder.cbGroupOrderStrategy': 'MODEL_ORDER',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.nodePlacement.favorStraightEdges': 'true'
        },
        children,
        edges: [...edges, ...mainAxisEdges]
    };
}

function collectElements(root) {
    let groups = [];
    let nodes = [];

    function visit(element, offsetX = 0, offsetY = 0) {
        let x = offsetX + (element.x || 0);
        let y = offsetY + (element.y || 0);
        if (element.dataType === 'expanded-group') {
            groups.push({ ...element, absoluteX: x, absoluteY: y });
        }
        if (element.dataType === 'collapsed-group' || element.dataType === 'node') {
            nodes.push({ ...element, absoluteX: x, absoluteY: y });
        }
        for (let child of element.children || []) {
            visit(child, x, y);
        }
    }

    visit(root);
    return { groups, nodes };
}

function edgePath(section) {
    let points = [section.startPoint, ...(section.bendPoints || []), section.endPoint];
    return d3
        .line()
        .x(point => point.x)
        .y(point => point.y)
        .curve(d3.curveLinear)(points);
}

function renderExpandedGroups(layer, groups) {
    let selection = layer
        .selectAll('.group-expanded')
        .data(groups, group => group.id)
        .join('g')
        .attr('class', group => `group-expanded palette-${architecture.groupById.get(group.sourceId).palette}`)
        .attr('transform', group => `translate(${group.absoluteX},${group.absoluteY})`);

    selection
        .append('rect')
        .attr('class', 'group-background')
        .attr('width', group => group.width)
        .attr('height', group => group.height)
        .attr('rx', 7);

    let heading = selection
        .append('foreignObject')
        .attr('class', 'group-heading')
        .attr('width', group => group.width)
        .attr('height', GROUP_HEADER_HEIGHT);

    heading
        .append('xhtml:div')
        .attr('class', 'group-heading-inner')
        .attr('role', 'button')
        .attr('tabindex', 0)
        .attr('aria-label', group => `Collapse ${architecture.groupById.get(group.sourceId).title}`)
        .html(group => {
            let source = architecture.groupById.get(group.sourceId);
            let description = DOMPurify.sanitize(source.description);
            return `<span>${source.title}</span><small>${description} &nbsp; −</small>`;
        })
        .on('click', (event, group) => {
            event.stopPropagation();
            toggleGroup(group.sourceId);
        })
        .on('keydown', (event, group) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleGroup(group.sourceId);
            }
        });
}

function renderNodes(layer, elements) {
    let selection = layer
        .selectAll('.diagram-node')
        .data(elements, element => element.id)
        .join('foreignObject')
        .attr('class', element => {
            if (element.dataType === 'collapsed-group') {
                let group = architecture.groupById.get(element.sourceId);
                return `diagram-node group-collapsed palette-${group.palette}`;
            }
            let node = architecture.nodeById.get(element.sourceId);
            return `diagram-node node palette-${node.palette}`;
        })
        .attr('x', element => element.absoluteX)
        .attr('y', element => element.absoluteY)
        .attr('width', element => element.width)
        .attr('height', element => element.height);

    selection.each(function (element) {
        let $foreignObject = d3.select(this);
        if (element.dataType === 'collapsed-group') {
            let group = architecture.groupById.get(element.sourceId);
            let description = DOMPurify.sanitize(group.description);
            $foreignObject
                .append('xhtml:div')
                .attr('class', 'group-toggle')
                .attr('role', 'button')
                .attr('tabindex', 0)
                .attr('aria-label', `Expand ${group.title}`)
                .html(
                    `<span><strong>${group.title}</strong><small>${description}</small></span><span class="toggle-symbol">+</span>`
                )
                .on('click', event => {
                    event.stopPropagation();
                    toggleGroup(group.id);
                })
                .on('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleGroup(group.id);
                    }
                });
            return;
        }

        let node = architecture.nodeById.get(element.sourceId);
        let card = $foreignObject.append('xhtml:div').attr('class', 'node-card');
        card.append('div').attr('class', 'node-title').text(node.title);
        card.append('div').attr('class', 'node-body').html(node.bodyHtml);
        card.selectAll('a')
            .attr('target', '_blank')
            .attr('rel', 'noreferrer')
            .on('click', event => event.stopPropagation());
    });
}

function renderEdges(layer, edges, elements) {
    let nodeElements = new Map(
        elements.nodes.filter(element => element.dataType === 'node').map(element => [element.sourceId, element])
    );
    let loopEdges = architecture.edges
        .filter(edge => edge.style === 'loop')
        .flatMap(edge => {
            let source = nodeElements.get(edge.source);
            let target = nodeElements.get(edge.target);
            if (!source || !target) {
                return [];
            }
            let sourceNode = architecture.nodeById.get(edge.source);
            let group = elements.groups.find(element => element.sourceId === sourceNode.groupId);
            if (!group) {
                return [];
            }
            let labelLines = wrapLabel(edge.label);
            let labelWidth = Math.min(180, Math.max(72, Math.max(...labelLines.map(line => line.length)) * 6.3 + 18));
            let labelHeight = labelLines.length * 14 + 10;
            let sourceY = source.absoluteY + source.height / 2;
            let targetY = target.absoluteY + target.height / 2;
            let loopX = group.absoluteX + group.width + 30;
            return [
                {
                    id: `visible-${edge.id}`,
                    edgeStyle: 'loop',
                    labelText: edge.label,
                    labelLines,
                    sections: [
                        {
                            id: `section-${edge.id}`,
                            startPoint: { x: source.absoluteX + source.width, y: sourceY },
                            bendPoints: [
                                { x: loopX, y: sourceY },
                                { x: loopX, y: targetY }
                            ],
                            endPoint: { x: target.absoluteX + target.width, y: targetY }
                        }
                    ],
                    labels: [
                        {
                            id: `label-${edge.id}`,
                            x: loopX + 10,
                            y: (sourceY + targetY - labelHeight) / 2,
                            width: labelWidth,
                            height: labelHeight
                        }
                    ]
                }
            ];
        });
    let visibleEdges = [...edges.filter(edge => edge.dataType !== 'layout-edge'), ...loopEdges];
    let sections = visibleEdges.flatMap(edge =>
        (edge.sections || []).map(section => ({ edge, section, id: `${edge.id}-${section.id}` }))
    );
    layer
        .selectAll('.edge')
        .data(sections, section => section.id)
        .join('path')
        .attr('class', section => {
            let modifier = section.edge.edgeStyle === 'dashed' ? ' edge-dashed' : '';
            if (section.edge.edgeStyle === 'loop') {
                modifier = ' edge-loop';
            }
            return `edge${modifier}`;
        })
        .attr('d', section => edgePath(section.section));

    let labels = visibleEdges.flatMap(edge =>
        (edge.labels || []).map(label => ({
            ...label,
            edgeId: edge.id,
            lines: edge.labelLines || wrapLabel(edge.labelText || '')
        }))
    );
    let labelSelection = layer
        .selectAll('.edge-label')
        .data(labels, label => label.id)
        .join('g')
        .attr('class', 'edge-label')
        .attr('transform', label => `translate(${label.x || 0},${label.y || 0})`);

    labelSelection
        .append('rect')
        .attr('width', label => label.width)
        .attr('height', label => label.height)
        .attr('rx', 4);

    labelSelection
        .append('text')
        .attr('x', label => label.width / 2)
        .attr('y', label => (label.height - (label.lines.length - 1) * 14) / 2 + 4)
        .selectAll('tspan')
        .data(label => label.lines.map((line, index) => ({ line, index, width: label.width })))
        .join('tspan')
        .attr('x', line => line.width / 2)
        .attr('dy', line => (line.index === 0 ? 0 : 14))
        .text(line => line.line);
}

async function render(options = {}) {
    let sequence = ++renderSequence;
    let activeGroups = new Set(expandedGroups);

    try {
        let result = await elk.layout(buildLayoutGraph(activeGroups));
        if (sequence !== renderSequence) {
            return;
        }
        layoutResult = result;
        let previousFrames = viewport.selectAll('.render-frame');
        let frame = viewport.append('g').attr('class', 'render-frame').attr('opacity', 0);
        let elements = collectElements(result);
        renderExpandedGroups(frame.append('g').attr('class', 'groups'), elements.groups);
        renderEdges(frame.append('g').attr('class', 'edges'), result.edges || [], elements);
        renderNodes(frame.append('g').attr('class', 'nodes'), elements.nodes);
        $message.hidden = true;
        let animationDuration = options.animate === false ? 0 : getAnimationDuration();
        let movement = options.direction === 'collapse' ? -36 : 36;
        previousFrames.style('pointer-events', 'none');
        if (animationDuration === 0) {
            previousFrames.remove();
            frame.attr('opacity', 1);
        } else {
            frame.attr('transform', `translate(0,${movement})`);
            previousFrames
                .transition()
                .duration(animationDuration)
                .ease(d3.easeCubicInOut)
                .attr('opacity', 0)
                .attr('transform', `translate(0,${-movement})`)
                .remove();
            frame
                .transition()
                .duration(animationDuration)
                .ease(d3.easeCubicInOut)
                .attr('opacity', 1)
                .attr('transform', 'translate(0,0)');
        }

        if (options.initial) {
            fitView('width');
        } else if (options.focusGroup) {
            focusGroup(options.focusGroup, elements, options.direction);
        } else if (options.fit !== false) {
            fitView();
        }
    } catch (error) {
        $message.hidden = false;
        $message.textContent = `Unable to render architecture: ${error.message}`;
        throw error;
    }
}

function getAnimationDuration() {
    return ANIMATION_DURATION;
}

function fitView(mode = 'all') {
    if (!layoutResult) {
        return;
    }
    let bounds = svg.node().getBoundingClientRect();
    let padding = 52;
    let scale = Math.min(1, (bounds.width - padding * 2) / Math.max(layoutResult.width, 1));
    if (mode !== 'width') {
        scale = Math.min(scale, (bounds.height - padding * 2) / Math.max(layoutResult.height, 1));
    }
    scale = Math.max(0.08, scale);
    let x = (bounds.width - layoutResult.width * scale) / 2;
    let y = mode === 'width' ? 68 : (bounds.height - layoutResult.height * scale) / 2;
    svg.transition()
        .duration(getAnimationDuration())
        .ease(d3.easeCubicInOut)
        .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
}

function focusGroup(groupId, elements, direction) {
    let target =
        elements.groups.find(group => group.sourceId === groupId) ||
        elements.nodes.find(node => node.dataType === 'collapsed-group' && node.sourceId === groupId);
    if (!target) {
        fitView();
        return;
    }
    let bounds = svg.node().getBoundingClientRect();
    let padding = 90;
    let scale = Math.min(
        1,
        (bounds.width - padding * 2) / Math.max(target.width, 1),
        (bounds.height - padding * 2) / Math.max(target.height, 1)
    );
    scale = Math.max(0.35, scale);
    if (direction === 'expand') {
        let currentScale = d3.zoomTransform(svg.node()).k;
        scale = Math.min(currentScale, Math.max(scale, currentScale * 0.82));
    }
    let x = bounds.width / 2 - (target.absoluteX + target.width / 2) * scale;
    let y =
        direction === 'expand'
            ? padding - target.absoluteY * scale
            : bounds.height / 2 - (target.absoluteY + target.height / 2) * scale;
    svg.transition()
        .duration(getAnimationDuration())
        .ease(d3.easeCubicInOut)
        .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
}

function toggleGroup(groupId) {
    let isExpanded = expandedGroups.has(groupId);
    if (isExpanded) {
        expandedGroups.delete(groupId);
    } else {
        expandedGroups.add(groupId);
    }
    requestRender({ focusGroup: groupId, direction: isExpanded ? 'collapse' : 'expand' });
}

function changeZoom(factor) {
    svg.transition().duration(180).call(zoom.scaleBy, factor);
}

function requestRender(options = {}) {
    render(options).catch(error => console.error(error));
}

document.querySelector('#collapse-all').addEventListener('click', () => {
    expandedGroups.clear();
    requestRender({ direction: 'collapse' });
});
document.querySelector('#expand-all').addEventListener('click', () => {
    expandedGroups = new Set(architecture.groups.map(group => group.id));
    requestRender({ direction: 'expand' });
});
document.querySelector('#zoom-in').addEventListener('click', () => changeZoom(1.25));
document.querySelector('#zoom-out').addEventListener('click', () => changeZoom(0.8));
document.querySelector('#fit-view').addEventListener('click', fitView);
window.addEventListener('resize', () => fitView('width'));

async function load() {
    try {
        let markdown = window.ARCHITECTURE_MARKDOWN;
        if (window.location.protocol !== 'file:') {
            let response = await fetch('architecture.md', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Markdown request failed with status ${response.status}.`);
            }
            markdown = await response.text();
        }
        if (!markdown) {
            throw new Error('Local architecture data is missing.');
        }
        architecture = parseArchitecture(markdown);
        measureNodes();
        lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
        await render({ initial: true, animate: false });
        for (let $button of document.querySelectorAll('.controls button')) {
            $button.disabled = false;
        }
    } catch (error) {
        $message.hidden = false;
        $message.textContent = `Unable to load architecture: ${error.message}`;
        console.error(error);
    }
}

load();
