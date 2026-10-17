import React, { useState, useEffect } from 'react';
import { RotateCcw, Truck, Package, X } from 'lucide-react';
import { sampleEvidencePaths } from '../graph.mjs';
import { StatusBadge as Tag } from './ui.jsx';

function buildGraph(investigation) {
  const paths = investigation.evidence.paths || [],
    c = investigation.conclusion;
  const target = c.target?.id;
  const samples = sampleEvidencePaths(paths, c);
  const nodes = [],
    edges = [],
    add = (id, type, label, x, y, detail) => {
      if (!nodes.find((n) => n.id === id)) nodes.push({ id, type, label, x, y, detail });
    },
    link = (a, b, label) => {
      if (!edges.find((e) => e.source === a && e.target === b))
        edges.push({ source: a, target: b, label });
    };
  const batchIds = [...new Set(samples.map((p) => p.batchId))],
    couriers = [...new Set(samples.map((p) => p.courier))];
  samples.forEach((p, i) => {
    const y = 65 + i * 62;
    add(p.returnId, 'return', p.returnId, 75, y, p.reason);
    add(p.orderId, 'order', p.orderId, 230, y, 'Source order');
    add(p.unitId, 'unit', p.unitId, 385, y, 'Individual product unit');
    link(p.returnId, p.orderId, 'FOR_ORDER');
    link(p.orderId, p.unitId, 'CONTAINS');
  });
  batchIds.forEach((id, i) =>
    add(
      id,
      'batch',
      id,
      565,
      115 + i * 100,
      id === target ? 'Leading batch association' : 'Comparison batch',
    ),
  );
  couriers.forEach((id, i) =>
    add(
      id,
      'courier',
      id,
      735,
      60 + i * 90,
      id === target ? 'Leading courier association' : 'Shipping partner',
    ),
  );
  for (const p of samples) {
    link(p.unitId, p.batchId, 'FROM_BATCH');
    link(p.orderId, p.courier, 'SHIPPED_BY');
  }
  return { nodes, edges, sampleCount: samples.length, total: paths.length, target };
}
export function EvidenceGraph({ investigation, large = false }) {
  const [selected, setSelected] = useState(null),
    [zoom, setZoom] = useState(1),
    [shipping, setShipping] = useState(investigation.conclusion.kind === 'courier_damage');
  useEffect(() => {
    setSelected(null);
    setZoom(1);
    setShipping(investigation.conclusion.kind === 'courier_damage');
  }, [investigation.id]);
  const graph = buildGraph(investigation),
    colors = {
      return: '#e8dacb',
      order: '#e4e9e0',
      unit: '#e3e8ef',
      batch: '#cae8b9',
      courier: '#ded8ec',
    };
  const nodes = graph.nodes.filter((n) => shipping || n.type !== 'courier'),
    edges = graph.edges.filter((e) => shipping || e.label !== 'SHIPPED_BY');
  return (
    <div className={`evidence-graph ${large ? 'large' : ''}`}>
      <div className="graph-toolbar">
        <span>
          <i className="green-dot" />
          {graph.sampleCount} of {graph.total} return paths shown
        </span>
        <label>
          <input
            type="checkbox"
            checked={shipping}
            onChange={(e) => setShipping(e.target.checked)}
          />
          Show couriers
        </label>
        <div>
          <button
            className="icon-button"
            aria-label="Zoom out graph"
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
          >
            −
          </button>
          <button className="icon-button" aria-label="Reset graph zoom" onClick={() => setZoom(1)}>
            {Math.round(zoom * 100)}%
          </button>
          <button
            className="icon-button"
            aria-label="Zoom in graph"
            onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
          >
            +
          </button>
        </div>
      </div>
      <div className="graph-canvas">
        <svg
          viewBox={shipping ? '0 0 850 440' : '0 0 670 440'}
          role="group"
          aria-label="Interactive evidence paths from returned orders to manufacturing batches"
        >
          <defs>
            <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r=".8" fill="#dce2d9" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
          <g transform={`translate(${(1 - zoom) * 340} ${(1 - zoom) * 200}) scale(${zoom})`}>
            {edges.map((e) => {
              const a = nodes.find((n) => n.id === e.source),
                b = nodes.find((n) => n.id === e.target);
              if (!a || !b) return null;
              const hot = selected && (e.source === selected.id || e.target === selected.id);
              return (
                <g key={`${e.source}-${e.target}`}>
                  <path
                    d={`M ${a.x + 30} ${a.y} C ${a.x + 100} ${a.y}, ${b.x - 100} ${b.y}, ${b.x - 30} ${b.y}`}
                    fill="none"
                    stroke={hot ? '#4d823d' : e.target === graph.target ? '#9fbd8e' : '#c8d2c3'}
                    strokeWidth={hot ? 2.5 : 1.3}
                    opacity={selected && !hot ? 0.65 : 1}
                  />
                  {hot && (
                    <text
                      x={(a.x + b.x) / 2}
                      y={(a.y + b.y) / 2 - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#56714c"
                    >
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
            {nodes.map((n) => (
              <g
                key={n.id}
                className="graph-node"
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${n.type} ${n.id}`}
                onClick={() => setSelected(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(n);
                  }
                }}
              >
                <rect
                  x={n.x - 31}
                  y={n.y - 21}
                  width="62"
                  height="42"
                  rx="12"
                  fill={colors[n.type]}
                  stroke={
                    selected?.id === n.id
                      ? '#365b2b'
                      : n.id === graph.target
                        ? '#6d984e'
                        : '#c7d1c2'
                  }
                  strokeWidth={n.id === graph.target || selected?.id === n.id ? 2 : 1}
                />
                {n.type === 'return' ? (
                  <RotateCcw x={n.x - 10} y={n.y - 11} width="20" height="20" color="#6d5744" />
                ) : n.type === 'courier' ? (
                  <Truck x={n.x - 10} y={n.y - 11} width="20" height="20" color="#675582" />
                ) : (
                  <Package x={n.x - 10} y={n.y - 11} width="20" height="20" color="#4f6546" />
                )}
                <text
                  x={n.x}
                  y={n.y + 37}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#53604f"
                  fontWeight={n.id === graph.target ? 700 : 400}
                >
                  {n.label}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
      <div className="graph-bottom">
        {selected ? (
          <div className="selected-node">
            <Tag>{selected.type}</Tag>
            <strong>{selected.id}</strong>
            <span>{selected.detail}</span>
            <button
              className="icon-button"
              aria-label="Clear graph selection"
              onClick={() => setSelected(null)}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="graph-legend">
            {Object.entries(colors)
              .filter(([type]) => shipping || type !== 'courier')
              .map(([type, color]) => (
                <span key={type}>
                  <i style={{ background: color }} />
                  {type}
                </span>
              ))}
            <small>Click a node to inspect</small>
          </div>
        )}
      </div>
    </div>
  );
}
