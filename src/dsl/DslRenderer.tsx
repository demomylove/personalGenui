import React from 'react';
import { WidgetMapper } from './WidgetMapper';
import AirConditioningCard from "../components/AirConditioningCard";
import SeatControlCard from "../components/SeatControlCard";
import WindowControlCard from "../components/WindowControlCard";

export interface DslNodeProps {
    component: any;
    data: any;
    onInteraction?: (action: any) => void;
}

const DslNodeComponent: React.FC<DslNodeProps> = ({ component, data, onInteraction }) => {
    if (!component) return null;

    const type = component.component_type;
    const properties = component.properties || {};
    const children = component.children || [];

    // Debug log for non-layout nodes (optional, can be removed for prod)
    // if (type !== 'Text' && type !== 'SizedBox' && type !== 'Spacer' && type !== 'Padding' && type !== 'Align') {
    //    console.log('[DslRenderer] Rendering:', type);
    // }

    // Hardcoded custom cards
    if (type === 'car_control_ac') return <AirConditioningCard />;
    if (type === 'car_control_seat') return <SeatControlCard />;
    if (type === 'car_control_window') return <WindowControlCard />;

    // Special handling for Loop
    if (type === 'Loop') {
        const itemsKey = properties.items?.replace(/{{|}}/g, '').trim();
        const itemAlias = properties.item_alias;
        const separator = properties.separator;

        const items = resolvePath(itemsKey, data);

        if (Array.isArray(items)) {
            const loopChildren: React.ReactNode[] = [];
            items.forEach((item, index) => {
                const itemContext = { ...data, [itemAlias]: item };

                children.forEach((childTemplate: any, childIndex: number) => {
                    const key = `${index}-${childIndex}`;
                    loopChildren.push(
                        <DslNode
                            key={key}
                            component={childTemplate}
                            data={itemContext}
                            onInteraction={onInteraction}
                        />
                    );
                });

                // Separator logic
                if (separator && index < items.length - 1) {
                    loopChildren.push(
                        WidgetMapper.buildWidget(
                            'SizedBox',
                            { height: separator },
                            [],
                            itemContext
                        )
                    );
                }
            });

            return (
                <React.Fragment>
                    {loopChildren}
                </React.Fragment>
            );
        }
        return null;
    }

    // Resolve properties
    const resolvedProps: any = {};
    Object.keys(properties).forEach((key) => {
        resolvedProps[key] = resolveValue(properties[key], data);
    });

    // Recursively render children
    const childrenArray = Array.isArray(children) ? children : [];
    const childWidgets = childrenArray.map((child: any, index: number) => (
        <DslNode
            key={index}
            component={child}
            data={data}
            onInteraction={onInteraction}
        />
    ));

    return WidgetMapper.buildWidget(type, resolvedProps, childWidgets, data, onInteraction);
};

// Optimization: Memoize the component to prevent re-renders of unchanged subtrees
// This relies on structural sharing of the 'component' prop from the JSON Patch updates.
export const DslNode = React.memo(DslNodeComponent, (prev, next) => {
    // 1. If component object reference is same, no change in DSL for this node
    // 2. If data reference is same, no change in binding context
    // 3. onInteraction usually stable
    return prev.component === next.component &&
           prev.data === next.data;
});

/**
 * Entry point for DslRenderer.
 * Wraps the root DslNode in a generic container.
 */
export const renderComponent = (component: any, data: any, onInteraction?: (action: any) => void): React.ReactNode => {
    return <DslNode component={component} data={data} onInteraction={onInteraction} />;
};

/**
 * Helper: Resolve {{value}} bindings
 */
const resolveValue = (value: any, data: any): any => {
    if (typeof value === 'string') {
        // 1. Handle {{ }} syntax
        if (value.includes('{{') && value.includes('}}')) {
            const reg = /{{(.*?)}}/g;
            return value.replace(reg, (match, key) => {
                let cleanKey = key.trim();
                let padLen = 0;
                let padChar = ' ';

                if (cleanKey.includes('|')) {
                    const parts = cleanKey.split('|');
                    cleanKey = parts[0].trim();
                    const pipe = parts[1].trim();
                    if (pipe.startsWith('padLeft')) {
                        const args = pipe.match(/padLeft\((\d+),\s*'(.)'\)/);
                        if (args) {
                            padLen = parseInt(args[1]);
                            padChar = args[2];
                        }
                    }
                }

                const val = resolvePath(cleanKey, data);
                let str = val !== undefined && val !== null ? String(val) : '';
                if (padLen > 0) {
                    str = str.padStart(padLen, padChar);
                }
                return str;
            });
        }

        // 2. Handle ${ } syntax
        if (value.includes('${') && value.includes('}')) {
            const reg = /\$\{(.*?)\}/g;
            return value.replace(reg, (match, key) => {
                const val = resolvePath(key.trim(), data);
                return val !== undefined && val !== null ? String(val) : '';
            });
        }
    }
    return value;
};

const resolvePath = (key: string, data: any): any => {
    const getVal = (path: string, source: any) => {
        const segments = path.split('.');
        let current = source;
        for (const seg of segments) {
            if (current && typeof current === 'object' && seg in current) {
                current = current[seg];
            } else {
                return undefined;
            }
        }
        return current;
    };

    // Try exact match
    let result = getVal(key, data);
    if (result !== undefined) return result;

    // Try stripping "data." prefix if present
    if (key.startsWith('data.')) {
        result = getVal(key.substring(5), data);
        if (result !== undefined) return result;
    }

    return undefined;
};
