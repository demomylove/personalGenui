import React from 'react';
// 仅导入 React Native 核心原生组件，确保安卓端兼容性
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ViewStyle,
    TextStyle,
    ImageStyle,
    Pressable // 替代部分 TouchableOpacity，增强安卓交互反馈
} from 'react-native';
// 必要第三方库（安卓端已适配）
import Slider from '@react-native-community/slider';
import LinearGradient from "react-native-linear-gradient";

// 网络图片组件，支持加载失败时显示备用图片
interface NetworkImageProps {
    originalSource: string;
    fallbackSource: string;
    style: ImageStyle;
    fadeDuration?: number;
}

const NetworkImage: React.FC<NetworkImageProps> = ({
    originalSource,
    fallbackSource,
    style,
    fadeDuration = 300
}) => {
    const [imageError, setImageError] = React.useState(false);
    const [loaded, setLoaded] = React.useState(false);
    const imageSource = imageError ? { uri: fallbackSource } : { uri: originalSource };

    return (
        <Image
            source={imageSource}
            style={[style, { opacity: loaded ? 1 : 0 }]} // Hide until loaded
            resizeMode={style.resizeMode as any}
            onError={(e) => {
                console.warn('[Android] 图片加载失败:', e.nativeEvent.error);
                setImageError(true);
                // If error, we show fallback (or nothing?), setting loaded true ensures error/fallback is visible if desired.
                // But user wants "nothing if not loaded". If error -> fallback, we show fallback.
                setLoaded(true); 
            }}
            onLoad={() => setLoaded(true)}
            fadeDuration={fadeDuration}
        />
    );
};

// Emoji 图标映射（避免安卓端矢量图标原生依赖问题）
const ICON_MAP: Record<string, string> = {
    wb_sunny: '☀️',
    cloud: '☁️',
    grain: '🌧️',
    nights_stay: '🌙',
    star: '⭐',
    attach_money: '💰',
    access_time: '🕒',
    category: '🏷️',
    music_note: '🎵',
    play_circle_fill: '▶️',
    pause_circle_filled: '⏸️',
    location_on: '📍',
    help_outline: '❓',
};

// 安卓端友好的颜色映射（适配安卓系统配色规范）
const COLOR_MAP: Record<string, string | undefined> = {
    neon: undefined,    // 安卓系统青色 accent
    gradient: undefined,// 安卓系统深橙色 accent
    default: undefined, // 安卓系统绿色 accent
    primary: undefined, // 安卓系统主蓝色
    secondary: undefined,// 安卓系统次橙色
    error: undefined,   // 安卓系统错误红色
    success: undefined, // 安卓系统成功绿色
    text: undefined,    // 安卓系统主文本色
    textSecondary: 'rgba(255,255,255,0)', // 安卓系统次要文本色
    background: 'rgba(255,255,255,0)', // 安卓系统默认背景色
    card: 'rgba(255,255,255,0)',    // 安卓系统卡片背景色
    // neon: '#00BCD4',    // 安卓系统青色 accent
    // gradient: '#FF6E40',// 安卓系统深橙色 accent
    // default: '#69F0AE', // 安卓系统绿色 accent
    // primary: '#2196F3', // 安卓系统主蓝色
    // secondary: '#FF9800',// 安卓系统次橙色
    // error: '#F44336',   // 安卓系统错误红色
    // success: '#4CAF50', // 安卓系统成功绿色
    // text: '#212121',    // 安卓系统主文本色
    // textSecondary: 'rgba(255,255,255,0)', // 安卓系统次要文本色
    // background: 'rgba(255,255,255,0)', // 安卓系统默认背景色
    // card: 'rgba(255,255,255,0)',    // 安卓系统卡片背景色
};

/**
 * React Native（安卓端）DSL 核心渲染类
 * 功能：将 DSL 配置映射为 React Native 原生组件，适配安卓端样式与交互
 */
export class WidgetMapper {
    /**
     * 构建 React Native 原生组件
     * @param type DSL 组件类型（与 React Native 原生组件对应）
     * @param props DSL 组件属性
     * @param children 子组件节点数组
     * @param dataContext 数据上下文（用于数据绑定）
     * @param onInteraction 交互事件回调（向外暴露 DSL 定义的交互行为）
     * @returns React Native 组件节点
     */
    static buildWidget(
        type: string,
        props: Record<string, any> = {},
        children: React.ReactNode[] = [],
        dataContext: Record<string, any> = {},
        onInteraction?: (action: any) => void
    ): React.ReactNode {

        // 统一转为小写，兼容 DSL 配置大小写不一致问题（安卓端容错优化）
        const componentType = type && type.toLowerCase();

        switch (componentType) {
            // ------------- 布局组件（基于 View 原生组件，安卓端弹性布局核心）-------------
            case 'column': {
                const columnStyle: ViewStyle = {
                    flexDirection: 'column',
                    alignItems: this.parseCrossAxisAlignment(props.cross_axis_alignment),
                    justifyContent: this.parseMainAxisAlignment(props.main_axis_alignment),
                    padding: this.parsePadding(props.padding),
                    paddingTop: props.padding_top,
                    paddingBottom: props.padding_bottom,
                    paddingLeft: props.padding_left,
                    paddingRight: props.padding_right,
                    backgroundColor: props.background_color || COLOR_MAP.background,
                    flex: props.flex,
                    flexGrow: props.flex_grow,
                    flexShrink: props.flex_shrink,
                    width: props.width || 'auto',
                    height: props.height || 'auto',
                    margin: this.parsePadding(props.margin),
                    borderRadius: props.border_radius || 0,
                    minHeight: props.min_height, // Added minHeight support
                    maxHeight: props.max_height, // Added maxHeight support
                    gap: props.spacing || 0, // Added gap support for spacing between items
                };

                // 渲染核心内容
                const renderContent = () => (
                    <View style={columnStyle} pointerEvents={props.pointer_events || 'auto'}>
                        {children}
                    </View>
                );

                // 带点击交互的 Column（安卓端点击反馈优化）
                const clickAction = props.on_click || props.on_press || props.onPressed;
                if (clickAction && onInteraction) {
                    return (
                        <TouchableOpacity
                            onPress={() => {
                                console.log('[Android] Column Pressed:', clickAction);
                                onInteraction(clickAction);
                            }}
                            activeOpacity={props.active_opacity || 0.8} // 安卓端点击透明度反馈
                            delayPressIn={props.delay_press_in || 0}    // 安卓端点击延迟优化
                            style={columnStyle}
                            disabled={props.disabled || false}
                        >
                            {children}
                        </TouchableOpacity>
                    );
                }

                return renderContent();
            }

            case 'row': {
                const rowStyle: ViewStyle = {
                    flexDirection: 'row',
                    alignItems: this.parseCrossAxisAlignment(props.cross_axis_alignment),
                    justifyContent: this.parseMainAxisAlignment(props.main_axis_alignment),
                    padding: this.parsePadding(props.padding),
                    paddingTop: props.padding_top,
                    paddingBottom: props.padding_bottom,
                    paddingLeft: props.padding_left,
                    paddingRight: props.padding_right,
                    backgroundColor: props.background_color || COLOR_MAP.background,
                    flex: props.flex,
                    flexGrow: props.flex_grow,
                    flexShrink: props.flex_shrink,
                    width: props.width || 'auto',
                    height: props.height || 'auto',
                    margin: this.parsePadding(props.margin),
                    borderRadius: props.border_radius || 0,
                    gap: props.spacing || 4, // 安卓端默认间距优化
                };

                const renderContent = () => (
                    <View style={rowStyle} pointerEvents={props.pointer_events || 'auto'}>
                        {children}
                    </View>
                );

                const clickAction = props.on_click || props.on_press || props.onPressed;
                if (clickAction && onInteraction) {
                    return (
                        <TouchableOpacity
                            onPress={() => {
                                console.log('[Android] Row Pressed:', clickAction);
                                onInteraction(clickAction);
                            }}
                            activeOpacity={props.active_opacity || 0.8}
                            delayPressIn={props.delay_press_in || 0}
                            style={rowStyle}
                            disabled={props.disabled || false}
                        >
                            {children}
                        </TouchableOpacity>
                    );
                }

                return renderContent();
            }

            // ------------- 文本组件（基于 Text 原生组件，安卓端字体渲染优化）-------------
            case 'text': {
                const textColor = props.color || (props.color_binding ? this.parseBoundColor(props.color_binding, dataContext) : COLOR_MAP.text);
                const textContent = props.text_binding ? this.resolveBinding(props.text_binding, dataContext) : props.text || '';
                const fontSize = props.font_size || 14; // 安卓端默认字体大小
                const lineHeight = props.line_height || fontSize * 1.4; // 安卓端默认行高优化

                // 带图标文本
                if (props.icon) {
                    return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, ...props.wrapper_style }}>
                            <Text style={{ fontSize, color: textColor }}>
                                {ICON_MAP[props.icon] || ICON_MAP.help_outline}
                            </Text>
                            <Text
                                numberOfLines={props.max_lines || undefined}
                                ellipsizeMode={props.ellipsize_mode || 'tail'} // 安卓端文本截断优化
                                style={{
                                    fontSize,
                                    fontWeight: this.parseFontWeight(props.font_weight),
                                    color: textColor,
                                    lineHeight,
                                    textAlign: props.text_align || 'left',
                                    marginVertical: props.margin_vertical || 0,
                                    marginHorizontal: props.margin_horizontal || 0,
                                    flex: 1,
                                }}
                            >
                                {textContent}
                            </Text>
                        </View>
                    );
                }

                // 普通文本
                return (
                    <Text
                        numberOfLines={props.max_lines || undefined}
                        ellipsizeMode={props.ellipsize_mode || 'tail'}
                        selectable={props.selectable || false} // 安卓端文本可选配置
                        style={{
                            fontSize,
                            fontWeight: this.parseFontWeight(props.font_weight),
                            color: textColor,
                            lineHeight,
                            textAlign: props.text_align || 'left',
                            padding: this.parsePadding(props.padding),
                            margin: this.parsePadding(props.margin),
                            backgroundColor: props.background_color || 'transparent',
                            borderRadius: props.border_radius || 0,
                        }}
                    >
                        {textContent}
                    </Text>
                );
            }

            // ------------- 图片组件（基于 Image 原生组件，安卓端图片加载优化）-------------
            case 'image':
                return this.buildAndroidImage(props, dataContext);

            // ------------- 占位组件（基于 View 原生组件，安卓端布局占位）-------------
            case 'spacer':
            case 'sizedbox':
                return (
                    <View style={{
                        height: props.height || 0,
                        width: props.width || 0,
                        margin: this.parsePadding(props.margin),
                    }}>
                        {children}
                    </View>
                );

            // ------------- 对齐组件（基于 View 原生组件，安卓端布局对齐）-------------
            case 'align':
            case 'center':
                const alignment = this.parseAlignment(props.alignment);
                return (
                    <View
                        style={{
                            alignItems: componentType === 'center' ? 'center' : alignment.alignItems,
                            justifyContent: componentType === 'center' ? 'center' : alignment.justifyContent,
                            width: props.width || '100%',
                            height: props.height || 'auto',
                            minHeight: props.min_height, // Added minHeight for Center/Align
                            margin: this.parsePadding(props.margin),
                        }}
                    >
                        {children}
                    </View>
                );

            // ------------- 约束组件（基于 View 原生组件，安卓端尺寸约束）-------------
            case 'constrainedbox':
                return (
                    <View style={{
                        maxWidth: props.max_width_ratio ? `${props.max_width_ratio * 100}%` : props.max_width,
                        maxHeight: props.max_height_ratio ? `${props.max_height_ratio * 100}%` : props.max_height,
                        minWidth: props.min_width,
                        minHeight: props.min_height,
                        margin: this.parsePadding(props.margin),
                    }}>
                        {children}
                    </View>
                );

            // ------------- 内边距组件（基于 View 原生组件，安卓端内边距控制）-------------
            case 'padding':
                return (
                    <View style={{
                        padding: this.parsePadding(props.padding),
                        paddingTop: props.padding_top,
                        paddingBottom: props.padding_bottom,
                        paddingLeft: props.padding_left,
                        paddingRight: props.padding_right,
                    }}>
                        {children}
                    </View>
                );

            // ------------- 图标组件（基于 Text 原生组件，安卓端图标展示）-------------
            case 'icon':
                const iconName = props.icon || (props.icon_binding ? this.parseBoundIcon(props.icon_binding, dataContext) : 'help_outline');
                const iconColor = props.color || (props.color_binding ? this.parseBoundColor(props.color_binding, dataContext) : COLOR_MAP.text);
                return (
                    <Text style={{
                        fontSize: props.size || 24, // 安卓端默认图标大小
                        color: iconColor,
                        margin: this.parsePadding(props.margin),
                    }}>
                        {ICON_MAP[iconName] || ICON_MAP.help_outline}
                    </Text>
                );

            // ------------- 图标按钮（基于 TouchableOpacity 原生组件，安卓端交互优化）-------------
            case 'iconbutton': {
                const btnIconName = props.icon || (props.icon_binding ? this.resolveBinding(props.icon_binding, dataContext) : 'help_outline');
                const iconSize = props.size || 24;
                const iconColor = props.color || (props.color_binding ? this.parseBoundColor(props.color_binding, dataContext) : COLOR_MAP.primary);

                const handlePress = () => {
                    const action = props.on_click || props.on_press || props.onPressed;
                    console.log('[Android] Icon Button Pressed:', action);
                    if (action && onInteraction) {
                        onInteraction(action);
                    }
                };

                return (
                    <TouchableOpacity
                        onPress={handlePress}
                        activeOpacity={props.active_opacity || 0.7}
                        delayPressIn={props.delay_press_in || 0}
                        style={{
                            padding: props.padding || 8, // 安卓端点击区域优化
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: props.border_radius || iconSize / 2, // 圆形图标按钮优化
                            backgroundColor: props.background_color || 'transparent',
                            margin: this.parsePadding(props.margin),
                        }}
                        disabled={props.disabled || false}
                    >
                        <Text style={{
                            fontSize: iconSize,
                            color: iconColor,
                        }}>
                            {this.evalIconExpression(props.icon_binding, dataContext) || ICON_MAP[btnIconName] || ICON_MAP.help_outline}
                        </Text>
                    </TouchableOpacity>
                );
            }

            // ------------- 卡片组件（基于 View 原生组件，安卓端阴影优化）-------------
            case 'card': {
                const cardStyle: ViewStyle = {
                    backgroundColor: props.background_color || COLOR_MAP.card,
                    borderRadius: props.border_radius || 8, // 安卓端默认卡片圆角
                    margin: this.parsePadding(props.margin) || 8,
                    elevation: props.elevation || 2, // 安卓端原生阴影（优于 shadow 属性）
                    padding: this.parsePadding(props.padding) || 16,
                    // 兼容安卓低版本阴影
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: props.shadow_opacity || 0.1,
                    shadowRadius: props.shadow_radius || 2,
                    borderWidth: props.border_width || 0,
                    borderColor: props.border_color || undefined,
                    width: props.width || 'auto',
                    height: props.height || 'auto',
                    minHeight: props.min_height, // Added minHeight support
                    maxHeight: props.max_height, // Added maxHeight support
                };

                const renderContent = () => (
                    <View style={cardStyle} pointerEvents={props.pointer_events || 'auto'}>
                        {children}
                    </View>
                );

                const clickAction = props.on_click || props.on_press || props.onPressed;
                if (clickAction && onInteraction) {
                    return (
                        <TouchableOpacity
                            onPress={() => {
                                console.log('[Android] Card Pressed:', clickAction);
                                onInteraction(clickAction);
                            }}
                            activeOpacity={props.active_opacity || 0.9}
                            delayPressIn={props.delay_press_in || 0}
                            style={cardStyle}
                            disabled={props.disabled || false}
                        >
                            {children}
                        </TouchableOpacity>
                    );
                }

                return renderContent();
            }

            // ------------- 按钮组件（基于 TouchableOpacity 原生组件，安卓端按钮规范）-------------
            case 'button': {
                const handleButtonPress = () => {
                    const action = props.on_click || props.on_press || props.onPressed;
                    console.log('[Android] Button Pressed:', action);
                    if (action && onInteraction) {
                        onInteraction(action);
                    }
                };

                // 安卓端按钮最小高度（符合 Material Design 规范）
                const minHeight = props.min_height || 48;

                return (
                    <TouchableOpacity
                        onPress={handleButtonPress}
                        activeOpacity={props.active_opacity || 0.8}
                        delayPressIn={props.delay_press_in || 0}
                        style={{
                            backgroundColor: props.background_color || COLOR_MAP.primary,
                            padding: props.padding || 12,
                            paddingHorizontal: (props.padding || 12) * 1.5,
                            borderRadius: props.border_radius || 4, // 安卓端默认按钮圆角
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight,
                            width: props.width || 'auto',
                            margin: this.parsePadding(props.margin),
                            borderWidth: props.border_width || 0,
                            borderColor: props.border_color || 'transparent',
                            elevation: props.elevation || 2, // 安卓端按钮阴影
                        }}
                        disabled={props.disabled || false}
                    >
                        <Text
                            style={{
                                color: props.text_color || COLOR_MAP.text,
                                fontSize: props.font_size || 16,
                                fontWeight: this.parseFontWeight(props.font_weight || 'bold'),
                                textAlign: 'center',
                            }}
                        >
                            {props.text || 'Button'}
                        </Text>
                    </TouchableOpacity>
                );
            }

            // ------------- 滑块组件（第三方库，安卓端适配优化）-------------
            case 'slider':
                const maxValue = this.resolveBinding(props.max_binding, dataContext) || 100;
                const sliderValue = this.resolveBinding(props.value_binding, dataContext) || 0;
                return (
                    <Slider
                        style={{ width: props.width || '100%', height: 40 }}
                        minimumValue={props.min_value || 0}
                        maximumValue={typeof maxValue === 'number' ? maxValue : 100}
                        value={typeof sliderValue === 'number' ? sliderValue : 0}
                        minimumTrackTintColor={props.min_track_color || COLOR_MAP.primary}
                        maximumTrackTintColor={props.max_track_color || '#E0E0E0'}
                        thumbTintColor={props.thumb_color || COLOR_MAP.primary}
                        step={props.step || 1}
                        onValueChange={props.on_value_change && onInteraction ? (value) => {
                            onInteraction({ type: 'slider_change', value });
                        } : undefined}
                    />
                );

            // ------------- 渐变组件（第三方库，安卓端渐变适配）-------------
            case 'lineargradient':
                return (
                    <LinearGradient
                        colors={[
                            props.start_color || COLOR_MAP.primary,
                            props.end_color || COLOR_MAP.secondary
                        ]}
                        style={{
                            flex: props.flex || 1,
                            borderRadius: props.border_radius || 0,
                            padding: this.parsePadding(props.padding) || 0,
                            margin: this.parsePadding(props.margin) || 0,
                            width: props.width || 'auto',
                            height: props.height || 'auto',
                            alignItems: props.align_items || 'center',
                            justifyContent: props.justify_content || 'center',
                        }}
                        start={{ x: props.start_x || 0, y: props.start_y || 0 }}
                        end={{ x: props.end_x || 1, y: props.end_y || 0 }}
                        locations={props.locations}
                    >
                        {children}
                    </LinearGradient>
                );

            // ------------- 默认组件（容错处理，避免安卓端渲染崩溃）-------------
            default:
                console.warn('[Android] 未知组件 Unsupported widget type:', type);
                const defaultView = <View style={{ padding: 4, backgroundColor: '#F5F5F5' }} />;
                const renderDefault = () => children.length > 0 ? <View>{children}</View> : defaultView;

                if (props.on_click && onInteraction) {
                    return (
                        <TouchableOpacity
                            onPress={() => onInteraction(props.on_click)}
                            activeOpacity={0.8}
                            delayPressIn={0}
                        >
                            {renderDefault()}
                        </TouchableOpacity>
                    );
                }
                return renderDefault();
        }
    }

    // ==================== 工具方法：安卓端样式解析 ====================
    /**
     * 解析交叉轴对齐方式（适配安卓端弹性布局）
     */
    static parseCrossAxisAlignment(s?: string): 'flex-start' | 'center' | 'flex-end' | 'stretch' {
        switch (s?.toLowerCase()) {
            case 'start':
                return 'flex-start';
            case 'center':
                return 'center';
            case 'end':
                return 'flex-end';
            case 'stretch':
                return 'stretch';
            default:
                return 'flex-start';
        }
    }

    /**
     * 解析主轴对齐方式（适配安卓端弹性布局）
     */
    static parseMainAxisAlignment(s?: string): 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly' {
        switch (s?.toLowerCase()) {
            case 'start':
                return 'flex-start';
            case 'center':
                return 'center';
            case 'end':
                return 'flex-end';
            case 'spacebetween':
                return 'space-between';
            case 'spacearound':
                return 'space-around';
            case 'spaceevenly':
                return 'space-evenly';
            default:
                return 'flex-start';
        }
    }

    /**
     * 解析字体粗细（适配安卓端字体渲染）
     */
    static parseFontWeight(s?: string): 'normal' | 'bold' | '500' | '600' | '700' {
        switch (s?.toLowerCase()) {
            case 'bold':
                return 'bold';
            case 'w500':
            case '500':
                return '500';
            case 'w600':
            case '600':
                return '600';
            case 'w700':
            case '700':
                return '700';
            default:
                return 'normal';
        }
    }

    /**
     * 解析内边距/外边距（安卓端样式兼容）
     * 支持：数字、数组（[top, right, bottom, left] / [vertical, horizontal]）
     */
    static parsePadding(v?: any): number | undefined {
        if (typeof v === 'number') {
            return v;
        }
        if (Array.isArray(v)) {
            if (v.length === 4 || v.length === 2) {
                return v[0]; // 统一返回第一个值，兼容安卓端简单布局
            }
        }
        return undefined;
    }

    /**
     * 解析对齐方式（适配安卓端布局）
     */
    static parseAlignment(s?: string): {
        alignItems: ViewStyle['alignItems'],
        justifyContent: ViewStyle['justifyContent']
    } {
        switch (s?.toLowerCase()) {
            case 'center':
                return { alignItems: 'center', justifyContent: 'center' };
            case 'centerleft':
                return { alignItems: 'flex-start', justifyContent: 'center' };
            case 'centerright':
                return { alignItems: 'flex-end', justifyContent: 'center' };
            case 'topright':
                return { alignItems: 'flex-end', justifyContent: 'flex-start' };
            case 'bottomcenter':
                return { alignItems: 'center', justifyContent: 'flex-end' };
            default:
                return { alignItems: 'flex-start', justifyContent: 'flex-start' };
        }
    }

    // ==================== 工具方法：数据绑定（安卓端数据联动） ====================
    /**
     * 解析绑定的颜色（适配安卓端配色）
     */
    static parseBoundColor(key: string, ctx: Record<string, any>): string | undefined {
        if (!key || !ctx) return COLOR_MAP.default;
        const val = this.resolveBinding(key, ctx);
        return COLOR_MAP[val as string] || COLOR_MAP.default;
    }

    /**
     * 解析绑定的图标（适配安卓端图标展示）
     */
    static parseBoundIcon(key: string, ctx: Record<string, any>): string {
        if (!key || !ctx) return 'help_outline';
        const val = (this.resolveBinding(key, ctx) || '').toString().toLowerCase();
        if (val.includes('晴')) return 'wb_sunny';
        if (val.includes('云')) return 'cloud';
        if (val.includes('雨')) return 'grain';
        if (val.includes('星')) return 'star';
        if (val.includes('夜')) return 'nights_stay';
        return 'nights_stay';
    }

    /**
     * 构建安卓端图片组件（优化加载容错与本地图片支持）
     */
    static buildAndroidImage(props: Record<string, any>, dataContext: Record<string, any>): React.ReactNode {
        // [Safety]: Remove the null return so we can render a placeholder
        // if (!props.source && !props.conditional_source) { return null; }

        let imageSource: any = props.source;

        // 解析条件化图片源
        if (props.conditional_source) {
            const resolvedUrl = this.resolveBinding(props.conditional_source, dataContext);
            if (resolvedUrl) {
                imageSource = resolvedUrl;
            }
        }

        // 图片样式配置（安卓端适配）
        const isPoiThumb = props.context === 'poi_item' || props.is_thumbnail === true;
        const thumbSize = props.thumb_size || 64;

        // [Fix]: Pre-calculate IsAmapPoi here to affect default styling
        const isAmapPoi = props.source && (typeof props.source === 'string') && (props.source.includes('autonavi') || props.source.includes('amap') || props.source.includes('wsrv.nl'));
        
        // [Fix]: Heuristic - If height is explicitly small (thumbnail), default width should match height, not 100%
        // [Optimized]: Default width now defaults to thumbSize (80/64) instead of '100%' to prevent huge initial renders.
        // We also force small default if source is missing (Placeholder state)
        const isMissingSource = !imageSource;
        const isSmallHeight = props.height && !isNaN(Number(props.height)) && Number(props.height) < 150;
        const defaultWidth = (isPoiThumb || isAmapPoi || isSmallHeight || isMissingSource) ? (props.height ?? thumbSize) : thumbSize; 

        const imageStyle: ImageStyle = {
            // If width is explicitly '100%', allow it. Otherwise default to small.
            width: props.width === 'infinity' ? undefined : (props.width ?? defaultWidth),
            height: props.height ?? ((isPoiThumb || isAmapPoi || isMissingSource) ? thumbSize : 200),
            // 对缩略图设置 max 边界，避免撑高父容器
            maxHeight: isPoiThumb ? thumbSize : undefined,
            maxWidth: isPoiThumb ? thumbSize : undefined,
            borderRadius: props.border_radius || 0,
            backgroundColor: props.color || 'transparent',
            resizeMode: props.resize_mode || (isPoiThumb ? 'cover' : 'cover'),
            margin: this.parsePadding(props.margin),
            borderWidth: props.border_width || 0,
            borderColor: props.border_color || 'transparent',
        };

        // 1. 网络图片（安卓端 http/https 支持）
        // [Fix]: Treat missing source as network image path so we enter the strict container logic for placeholder
        if (isMissingSource || (typeof imageSource === 'string' && (imageSource.startsWith('http') || imageSource.startsWith('https')))) {
            // 严格缩略图容器：固定容器尺寸，内部图片100%填充，避免 onLoad 回流撑高行
            // 修改：只要有明确宽高的图片都使用严格容器，防止布局抖动 (Remove size limit <= 80)
            const hasExplicitSize = props.width && props.height && !isNaN(Number(props.width)) && !isNaN(Number(props.height));
            
            // [Fix]: Also force strict sizing for Amap POI images (detected by URL) to handle streaming race conditions
            // We reuse the variable calculated above
            // const isAmapPoi = imageSource.includes('autonavi') || imageSource.includes('amap') || imageSource.includes('wsrv.nl');
            
            const isStrictThumb = isPoiThumb || hasExplicitSize || isAmapPoi || isMissingSource;
            if (isStrictThumb) {
                const w = Number(props.width) || thumbSize;
                const h = Number(props.height) || thumbSize;
                
                // [Fix]: Placeholder Color
                // If source is missing, use transparent to show nothing (as requested by user)
                const bgColor = props.color || 'transparent';

                return (
                    <View style={{ width: w, height: h, overflow: 'hidden', borderRadius: props.border_radius || 0, margin: this.parsePadding(props.margin), backgroundColor: bgColor }}>
                        {imageSource ? (
                            <NetworkImage
                                originalSource={imageSource}
                                fallbackSource="" 
                                style={{ width: '100%', height: '100%', resizeMode: 'cover' } as ImageStyle}
                                fadeDuration={0}
                            />
                        ) : null}
                    </View>
                );
            }
            return (
                <NetworkImage
                    originalSource={imageSource}
                    fallbackSource=""
                    style={imageStyle}
                    fadeDuration={props.fade_duration || 200}
                />
            );
        }

        // 2. 本地图片（安卓端 require 支持，如 require('./assets/image.png')）
        if (typeof imageSource === 'number') {
            return (
                <Image
                    source={imageSource}
                    style={imageStyle}
                    resizeMode={imageStyle.resizeMode as any}
                />
            );
        }

        // 3. 占位图（安卓端加载失败兜底）
        return (
            <View
                style={{
                    ...imageStyle,
                    backgroundColor: props.placeholder_color || '#E0E0E0',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Text style={{ color: COLOR_MAP.textSecondary, fontSize: 12 }}>
                    {props.placeholder_text || '暂无图片'}
                </Text>
            </View>
        );
    }

    /**
     * 解析数据绑定（支持 {{key}} 占位符和层级属性，如 user.info.name）
     */
    static resolveBinding(binding?: string, data: Record<string, any> = {}): any {
        if (!binding) return null;

        // 处理多占位符替换，如 "您好，{{user.name}}，今天{{weather.temp}}"
        if (binding.includes('{{')) {
            const reg = /{{(.*?)}}/g;
            let result = binding;
            let match;

            while ((match = reg.exec(binding)) !== null) {
                const key = match[1].trim();
                const value = this.getValue(key, data);
                result = result.replace(match[0], value !== undefined ? value : '');
            }

            return result;
        }

        // 处理直接层级属性访问
        return this.getValue(binding, data);
    }

    /**
     * 获取层级属性值（适配安卓端数据结构）
     */
    static getValue(key: string, data: Record<string, any> = {}): any {
        if (!key || !data) return undefined;

        const parts = key.split('.');
        let curr: any = data;

        for (const p of parts) {
            if (curr === null || curr === undefined) {
                return undefined;
            }
            curr = curr[p];
        }

        return curr;
    }

    /**
     * 解析图标三元表达式（适配安卓端动态图标切换）
     */
    static evalIconExpression(expr?: string, data: Record<string, any> = {}): any {
        if (!expr) return null;

        // 处理三元表达式，如 "playerState.playing ? 'pause_circle_filled' : 'play_circle_fill'"
        if (expr.includes('?') && expr.includes(':')) {
            try {
                const cleanExpr = expr.replace(/'/g, '').replace(/\s+/g, ' ').trim();
                const [conditionPart, resultPart] = cleanExpr.split('?');
                const [trueVal, falseVal] = resultPart.split(':').map(item => item.trim());

                const conditionValue = this.getValue(conditionPart.trim(), data);
                return conditionValue ? trueVal : falseVal;
            } catch (e) {
                console.warn('[Android] 图标三元表达式解析失败:', expr, e);
                return this.resolveBinding(expr, data);
            }
        }

        return this.resolveBinding(expr, data);
    }
}