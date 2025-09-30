FocusTimeMultiBars

        <SegmentedCommitBar
          title="Focus Time"
          subtitle="(deep work target)"
          value={value}
          highlightValue={bar1Val ?? null}
          labelsEnabled={true}
          onChange={(h) => {
            setBar1Val(h);
            setBar2Val(null);
            setBar3Val(null);
            onChange(h);
          }}
          segments={segments}
          step={step}
          start={start1}
          colorForIndex={colorBar1}
          showLabelAtIndex={fullHourLabel}
          lightDividerAt={1}
          tipForEndVal={tipFocus}
        />

        {/* Bar 2 */}
        <SegmentedCommitBar
          value={value}
          highlightValue={bar2Val ?? null}
          labelsEnabled={start2 != null}
          onChange={(h) => {
            if (start2 == null) return;
            setBar2Val(h);
            setBar3Val(null);
            onChange(h);
          }}
          segments={segments}
          step={step}
          start={start2 ?? 0}
          colorForIndex={(idx) => colorBarN(idx)}
          showLabelAtIndex={fullHourLabel}
          disabled={start2 == null}
          tipForEndVal={tipFocus}
        />

        {/* Bar 3 */}
        <SegmentedCommitBar
          value={value}
          highlightValue={bar3Val ?? null}
          labelsEnabled={start3 != null}
          onChange={(h) => {
            if (start3 == null) return;
            setBar3Val(h);
            onChange(h);
          }}
          segments={segments}
          step={step}
          start={start3 ?? 0}
          colorForIndex={(idx) => colorBarN(idx)}
          showLabelAtIndex={fullHourLabel}
          disabled={start3 == null}
          tipForEndVal={tipFocus}
        />