import React from "react";
import styled from "styled-components";
import {
  space,
  background,
  color,
  flexbox,
  typography,
  border,
  position,
  layout,
} from "styled-system";
import styledCss from "@styled-system/css";
import Box from "./Box";

// Resolves custom custom css props safely with theme integration
const StyledText = styled.p(
  space,
  layout,
  background,
  flexbox,
  color,
  typography,
  border,
  position,
  (props) => (props._css ? styledCss(props._css)(props) : null)
);

const Text = React.forwardRef(
  (
    {
      children,
      icon: Icon,
      iconSize = 20,
      iconColor = "grey",
      // Destructure all Space/Margin/Padding props to manage wrapper layout safely
      margin,
      m,
      mt,
      mr,
      mb,
      ml,
      mx,
      my,
      padding,
      p,
      pt,
      pr,
      pb,
      pl,
      px,
      py,
      iconTextWrapperProps,
      iconWrapperProps,
      ...rest
    },
    ref
  ) => {
    // Group space props to ensure they always target the outermost container element
    const spaceProps = { margin, m, mt, mr, mb, ml, mx, my, padding, p, pt, pr, pb, pl, px, py };

    return Icon ? (
      <Box
        display="inline-flex"
        alignItems="flex-start"
        verticalAlign="bottom"
        {...spaceProps}
        {...iconTextWrapperProps}
      >
        <Box
          color={iconColor}
          width={`${iconSize}px`}
          height={`${iconSize}px`}
          flexShrink={0}
          mr={2}
          position="relative"
          _css={{
            svg: {
              position: "absolute",
              top: 0,
              left: 0,
            },
          }}
          {...iconWrapperProps}
        >
          <Icon size={iconSize} />
        </Box>
        <StyledText ref={ref} lineHeight={1.25} {...rest}>
          {children}
        </StyledText>
      </Box>
    ) : (
      <StyledText ref={ref} {...spaceProps} {...rest}>
        {children}
      </StyledText>
    );
  }
);

Text.displayName = "Text";

export default Text;