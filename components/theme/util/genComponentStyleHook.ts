/* eslint-disable no-redeclare */
import type { CSSInterpolation } from '@ant-design/cssinjs';
import { useStyleRegister } from '@ant-design/cssinjs';
import { useContext } from 'react';
import { ConfigContext } from '../../config-provider/context';
import type { UseComponentStyleResult } from '../index';
import { mergeToken, statisticToken, useToken } from '../index';
import type { ComponentTokenMap, GlobalToken } from '../interface';
import warning from '../../_util/warning';

export type OverrideTokenWithoutDerivative = ComponentTokenMap;
export type OverrideComponent = keyof OverrideTokenWithoutDerivative;
export type GlobalTokenWithComponent<ComponentName extends OverrideComponent> = GlobalToken &
  ComponentTokenMap[ComponentName];

export interface StyleInfo {
  hashId: string;
  prefixCls: string;
  rootPrefixCls: string;
  iconPrefixCls: string;
}

export type TokenWithCommonCls<T> = T & {
  /** Wrap component class with `.` prefix */
  componentCls: string;
  /** Origin prefix which do not have `.` prefix */
  prefixCls: string;
  /** Wrap icon class with `.` prefix */
  iconCls: string;
  /** Wrap ant prefixCls class with `.` prefix */
  antCls: string;
};
export type FullToken<ComponentName extends OverrideComponent> = TokenWithCommonCls<
  GlobalTokenWithComponent<ComponentName>
>;

export default function genComponentStyleHook<ComponentName extends OverrideComponent>(
  component: ComponentName,
  styleFn: (token: FullToken<ComponentName>, info: StyleInfo) => CSSInterpolation,
  getDefaultToken?:
    | OverrideTokenWithoutDerivative[ComponentName]
    | ((token: GlobalToken) => OverrideTokenWithoutDerivative[ComponentName]),
) {
  return (prefixCls: string): UseComponentStyleResult => {
    const [theme, token, hashId] = useToken();
    const { getPrefixCls, iconPrefixCls } = useContext(ConfigContext);
    const rootPrefixCls = getPrefixCls();

    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      /* istanbul ignore next */
      warning(
        false,
        'Next',
        '\n\nYou are using dev version, ' +
          'which is used for validating and may not same as final release version.\n\n' +
          'DO NOT USE IN YOUR PRODUCTION!\n\n' +
          'Ref:#33862 - What is in experimental?\n' +
          'https://github.com/ant-design/ant-design/issues/33862#user-content-alpha-offset',
      );
    }

    return [
      useStyleRegister({ theme, token, hashId, path: [component, prefixCls] }, () => {
        const { token: proxyToken, flush } = statisticToken(token);

        const defaultComponentToken =
          typeof getDefaultToken === 'function' ? getDefaultToken(proxyToken) : getDefaultToken;
        const overrideComponentToken = token[component] as any;

        // Only merge token specified in interface
        const mergedComponentToken = { ...defaultComponentToken } as any;
        if (overrideComponentToken) {
          Object.keys(mergedComponentToken).forEach(key => {
            mergedComponentToken[key] = overrideComponentToken[key] ?? mergedComponentToken[key];
          });
        }
        const mergedToken = mergeToken<
          TokenWithCommonCls<GlobalTokenWithComponent<OverrideComponent>>
        >(
          proxyToken,
          {
            componentCls: `.${prefixCls}`,
            prefixCls,
            iconCls: `.${iconPrefixCls}`,
            antCls: `.${rootPrefixCls}`,
          },
          mergedComponentToken,
        );

        const styleInterpolation = styleFn(mergedToken as unknown as FullToken<ComponentName>, {
          hashId,
          prefixCls,
          rootPrefixCls,
          iconPrefixCls,
        });
        flush(component, mergedComponentToken);
        return styleInterpolation;
      }),
      hashId,
    ];
  };
}
